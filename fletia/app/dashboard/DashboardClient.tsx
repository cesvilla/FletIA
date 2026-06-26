'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/app/components/Sidebar';

interface Recordatorio { id: string; texto: string; fecha?: string; completado: boolean; }
interface Precio { empresa: string; tipo: string; precio: number; provincia?: string; }
interface Vencimiento { fecha: string; dias: number; tipo: string }

interface Props {
  email: string; empresa: string; userId: string;
  gastoMes: number; gananciasMes: number; totalViajes: number; totalCamiones: number;
  recordatorios: Recordatorio[]; precios: Precio[]; preciosFuente?: string;
  vencimiento?: Vencimiento | null;
}

export default function DashboardClient({ email, empresa, userId, gastoMes, gananciasMes, totalViajes, totalCamiones, recordatorios: initRecs, precios, preciosFuente, vencimiento }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recs, setRecs] = useState<Recordatorio[]>(initRecs);
  const [nuevoRec, setNuevoRec] = useState('');
  const [fechaRec, setFechaRec] = useState('');
  const [addingRec, setAddingRec] = useState(false);
  const [editingRec, setEditingRec] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');
  const [editFecha, setEditFecha] = useState('');

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function agregarRecordatorio() {
    if (!nuevoRec.trim()) return;
    const texto = nuevoRec.trim();
    const fecha = fechaRec || null;

    const { data, error } = await supabase.from('recordatorios').insert({
      user_id: userId, texto, fecha, completado: false
    }).select();

    if (error) {
      console.error('Error al guardar recordatorio:', error);
      return;
    }

    const nuevo = data?.[0] ?? { id: crypto.randomUUID(), texto, fecha, completado: false };
    setRecs([...recs, nuevo]);
    setNuevoRec('');
    setFechaRec('');
    setAddingRec(false);
  }

  async function completarRecordatorio(id: string) {
    await supabase.from('recordatorios').update({ completado: true }).eq('id', id);
    setRecs(recs.filter(r => r.id !== id));
  }

  async function eliminarRecordatorio(id: string) {
    await supabase.from('recordatorios').delete().eq('id', id);
    setRecs(recs.filter(r => r.id !== id));
  }

  function iniciarEdicion(r: Recordatorio) {
    setEditingRec(r.id);
    setEditTexto(r.texto);
    setEditFecha(r.fecha ?? '');
  }

  async function guardarEdicion(id: string) {
    if (!editTexto.trim()) return;
    await supabase.from('recordatorios').update({ texto: editTexto.trim(), fecha: editFecha || null }).eq('id', id);
    setRecs(recs.map(r => r.id === id ? { ...r, texto: editTexto.trim(), fecha: editFecha || undefined } : r));
    setEditingRec(null);
  }

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';
  const kpis = [
    {
      label: 'Gasto del mes',
      value: gastoMes > 0 ? `$${gastoMes.toLocaleString('es-AR')}` : '—',
      sub: gastoMes > 0 ? 'Este mes' : 'Sin viajes aún',
      color: '#e53935',       // rojo claro
      bgColor: '#fff5f5',
    },
    {
      label: 'Ganancias del mes',
      value: gananciasMes > 0 ? `$${gananciasMes.toLocaleString('es-AR')}` : '—',
      sub: gananciasMes > 0 ? 'Este mes' : 'Sin ingresos cargados',
      color: '#2e7d32',       // verde claro
      bgColor: '#f1f8f1',
    },
    {
      label: 'Viajes calculados',
      value: totalViajes.toString(),
      sub: totalViajes > 0 ? 'Total histórico' : 'Empezá ahora',
      color: null, bgColor: null,
    },
    {
      label: 'Camiones activos',
      value: totalCamiones.toString(),
      sub: totalCamiones > 0 ? 'En tu flota' : 'Agregá tu flota',
      color: null, bgColor: null,
    },
  ];

  const preciosPorEmpresa = precios.reduce((acc: Record<string, Precio[]>, p) => {
    if (!acc[p.empresa]) acc[p.empresa] = [];
    acc[p.empresa].push(p);
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar active="dashboard" empresa={empresa} email={email} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-56">
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

          {/* Aviso de vencimiento del plan — aparece cuando faltan ≤ 2 días o ya venció */}
          {vencimiento && vencimiento.dias <= 2 && (() => {
            const v = vencimiento;
            const vencido = v.dias <= 0;
            const esDemo = v.tipo === 'demo';
            const fechaFmt = new Date(v.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const titulo = vencido
              ? (esDemo ? 'Tu período de prueba venció' : 'Tu plan venció')
              : (esDemo ? 'Tu período de prueba está por terminar' : 'Tu plan está por vencer');
            const cuerpo = vencido
              ? `Venció el ${fechaFmt}. Renovalo para no perder el acceso a tus camiones y viajes.`
              : v.dias === 1
                ? `Vence mañana (${fechaFmt}).`
                : `Vence en ${v.dias} días — el ${fechaFmt}.`;
            return (
              <div
                className="mb-6 flex items-start gap-3 p-4 md:p-5 border-l-4"
                style={{
                  backgroundColor: vencido ? '#fff5f5' : '#fffaf0',
                  borderColor: vencido ? '#e53935' : '#c8860a',
                }}
              >
                <div className="text-2xl leading-none">{vencido ? '⛔' : '⏳'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-0.5" style={{ color: vencido ? '#c0392b' : '#a06a08' }}>{titulo}</div>
                  <div className="text-sm text-ink-2">
                    {cuerpo} Escribinos para renovar y seguir sin interrupciones.
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-card border border-ink/10 p-6 md:p-8 mb-6">
            <div className="font-mono text-[10px] tracking-[3px] text-accent uppercase mb-3">// Bienvenido a FletIA</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-3 leading-none text-ink">Hola, <span className="text-accent">{empresa}</span> 👋</h1>
            <p className="text-ink-2 text-base max-w-2xl">Aquí tenés un resumen de tus operaciones.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className="p-4 md:p-5"
                style={{
                  backgroundColor: kpi.bgColor || 'var(--color-card, #fff)',
                  border: `1px solid ${kpi.color ? kpi.color + '30' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <div
                  className="font-mono text-[9px] tracking-[2px] uppercase mb-2"
                  style={{ color: kpi.color ? kpi.color + 'bb' : undefined }}
                >{kpi.label}</div>
                <div
                  className="font-display text-2xl md:text-3xl font-bold leading-none mb-1.5"
                  style={{ color: kpi.color || undefined }}
                >{kpi.value}</div>
                <div className="font-mono text-[9px] text-ink-3">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-ink/10 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-mono text-[10px] tracking-[3px] text-accent uppercase">⛽ Gasoil hoy — tu región</div>
                <div className="font-mono text-[9px] text-ink-3">{new Date().toLocaleDateString('es-AR')}</div>
              </div>
              <div className="font-mono text-[9px] text-ink-3 mb-4">
                {preciosFuente === 'referencia'
                  ? 'Valores de referencia'
                  : 'Precio nacional + ajuste regional · ajustá tu provincia en la calculadora'}
              </div>
              {precios.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-2">⛽</div>
                  <div className="text-sm text-ink-2 mb-1">Sin datos disponibles</div>
                  <div className="font-mono text-[9px] text-ink-3">Reintentamos automáticamente en la próxima carga</div>
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
                    <div key={r.id} className="border border-ink/10 hover:bg-surface/50 transition-colors">
                      {editingRec === r.id ? (
                        <div className="p-3">
                          <input
                            type="text"
                            value={editTexto}
                            onChange={e => setEditTexto(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-ink/20 bg-white text-ink mb-2 outline-none"
                            onKeyDown={e => e.key === 'Enter' && guardarEdicion(r.id)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={editFecha}
                              onChange={e => setEditFecha(e.target.value)}
                              className="text-xs px-2 py-1.5 border border-ink/20 bg-white text-ink outline-none flex-1"
                            />
                            <button onClick={() => guardarEdicion(r.id)} className="bg-accent text-white px-3 py-1.5 text-xs font-bold hover:bg-accent/90">Guardar</button>
                            <button onClick={() => setEditingRec(null)} className="px-3 py-1.5 text-xs border border-ink/20 text-ink-2 hover:bg-surface">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 p-3">
                          <button onClick={() => completarRecordatorio(r.id)} className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded-sm flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors" title="Marcar completado" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-ink">{r.texto}</div>
                            {r.fecha && <div className="font-mono text-[9px] text-ink-3 mt-0.5">📅 {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</div>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                            <button
                              onClick={() => iniciarEdicion(r)}
                              className="w-6 h-6 flex items-center justify-center text-ink-3 hover:text-accent hover:bg-accent/10 rounded transition-colors text-xs"
                              title="Editar"
                            >✏️</button>
                            <button
                              onClick={() => eliminarRecordatorio(r.id)}
                              className="w-6 h-6 flex items-center justify-center text-ink-3 hover:text-red-500 hover:bg-red-50 rounded transition-colors font-bold text-sm"
                              title="Eliminar"
                            >×</button>
                          </div>
                        </div>
                      )}
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
