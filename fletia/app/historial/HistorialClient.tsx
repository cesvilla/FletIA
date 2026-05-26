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
  tipo_ruta?: string;
  terreno?: string;
  precio_combustible?: number;
  litros_totales: number;
  litros_reales?: number;
  consumo_real?: number;
  costo_total: number;
  costo_por_km: number;
  porcentaje_carga?: number;
  flete_cobrado?: number;
  factor_peso?: number;
  factor_ruta?: number;
  factor_terreno?: number;
  descripcion_ia?: string;
  created_at: string;
  camiones?: { patente: string; marca: string; modelo: string; capacidad_max_ton?: number };
}

interface EditForm {
  origen: string;
  destino: string;
  litros_reales: string;
}

const RUTA_LABEL: Record<string, string> = { autopista: '🛣️ Autopista', mixta: '🔀 Mixta', urbana: '🏙️ Urbana' };
const TERRENO_LABEL: Record<string, string> = { plano: '➡️ Plano', ondulado: '〰️ Ondulado', montanoso: '⛰️ Montañoso' };

export default function HistorialClient({ viajes: initViajes, email, empresa }: { viajes: Viaje[]; email: string; empresa: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viajes, setViajes] = useState<Viaje[]>(initViajes);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({ origen: '', destino: '', litros_reales: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; ok: boolean } | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function toggleExpandido(id: string) {
    setExpandido(prev => prev === id ? null : id);
    if (editando) { setEditando(null); setMensaje(null); }
  }

  function abrirEdicion(e: React.MouseEvent, v: Viaje) {
    e.stopPropagation();
    setEditando(v.id);
    setExpandido(v.id);
    setForm({ origen: v.origen || '', destino: v.destino || '', litros_reales: v.litros_reales?.toString() || '' });
    setMensaje(null);
  }

  function cerrarEdicion(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditando(null);
    setMensaje(null);
  }

  async function guardarEdicion(v: Viaje) {
    setGuardando(true);
    const litrosNum = parseFloat(form.litros_reales);
    const litrosValidos = !isNaN(litrosNum) && litrosNum > 0;

    const updates: Record<string, unknown> = {};
    if (form.origen.trim()) updates.origen = form.origen.trim();
    if (form.destino.trim()) updates.destino = form.destino.trim();
    if (litrosValidos) updates.litros_reales = litrosNum;

    if (Object.keys(updates).length > 0) {
      await supabase.from('viajes').update(updates).eq('id', v.id);
    }

    let mensajeIA = '';
    if (litrosValidos && litrosNum !== v.litros_reales) {
      const res = await fetch('/api/viajes/aprender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viaje_id: v.id, litros_reales: litrosNum }),
      });
      const json = await res.json();
      if (json.ok) {
        mensajeIA = json.aprendio
          ? ` · IA actualizada: ${json.consumoBaseAnterior} → ${json.consumoBaseNuevo} L/100km`
          : ' · IA: estimación ya era correcta';
      }
    }

    setViajes(prev => prev.map(x =>
      x.id === v.id
        ? { ...x, origen: form.origen.trim() || x.origen, destino: form.destino.trim() || x.destino, litros_reales: litrosValidos ? litrosNum : x.litros_reales }
        : x
    ));

    setMensaje({ id: v.id, texto: '✓ Guardado' + mensajeIA, ok: true });
    setGuardando(false);
    setTimeout(() => { setEditando(null); setMensaje(null); }, 2200);
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
                <div className="font-mono text-[9px] text-gray-400 mt-0.5">Hacé clic en un viaje para ver el detalle</div>
              </div>
              {viajes.map((v) => {
                const abierto = expandido === v.id;
                const margen = v.flete_cobrado
                  ? (((v.flete_cobrado - v.costo_total) / v.flete_cobrado) * 100).toFixed(1)
                  : null;
                const ganancia = v.flete_cobrado ? v.flete_cobrado - v.costo_total : null;
                const colorMargen = margen
                  ? parseFloat(margen) > 25 ? '#1a6b3a' : parseFloat(margen) > 10 ? '#c8860a' : '#d4440c'
                  : '#8a8278';

                return (
                  <div key={v.id} className="border-b last:border-b-0 border-gray-100">

                    {/* Fila principal — clickeable */}
                    <div
                      onClick={() => toggleExpandido(v.id)}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
                    >
                      {/* Chevron */}
                      <div style={{ color: '#9ca3af', fontSize: '10px', flexShrink: 0, transition: 'transform 0.2s', transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                        </div>
                        <div className="font-mono text-[9px] text-gray-400 mt-1">
                          {v.camiones?.patente} · {v.camiones?.marca} {v.camiones?.modelo} · {v.peso_carga} ton
                          {v.litros_reales && <span className="text-green-600"> · real: {v.litros_reales} lts ✓</span>}
                        </div>
                        <div className="font-mono text-[9px] text-gray-300 mt-0.5">
                          {new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 flex items-center gap-3">
                        <div>
                          <div className="text-lg font-bold">${v.costo_total.toLocaleString('es-AR')}</div>
                          <div className="font-mono text-[9px] text-gray-400">${v.costo_por_km}/km</div>
                        </div>
                        <button
                          onClick={(e) => abrirEdicion(e, v)}
                          className={`p-2 rounded transition-colors text-sm ${editando === v.id ? 'bg-gray-100 text-gray-400' : 'hover:bg-orange-50 text-gray-400 hover:text-orange-500'}`}
                          title="Editar viaje"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    {/* Panel expandido: detalle + edición */}
                    {abierto && (
                      <div className="border-t border-gray-100" style={{ backgroundColor: '#fafafa' }}>

                        {/* DETALLE */}
                        {editando !== v.id && (
                          <div className="px-6 py-5">
                            <div className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-4">// Detalle del viaje</div>

                            {/* Números principales */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              {[
                                { val: `${v.kilometros} km`, lab: 'Distancia' },
                                { val: `${v.peso_carga} ton`, lab: 'Carga' },
                                { val: `${v.litros_totales} lts`, lab: 'Litros estimados' },
                                { val: v.consumo_real ? `${v.consumo_real} lts/100km` : '—', lab: 'Consumo real' },
                              ].map(item => (
                                <div key={item.lab} className="bg-white border border-gray-200 p-3 text-center">
                                  <div className="font-bold text-sm">{item.val}</div>
                                  <div className="font-mono text-[8px] text-gray-400 uppercase mt-0.5">{item.lab}</div>
                                </div>
                              ))}
                            </div>

                            {/* Info de ruta */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                              <div className="bg-white border border-gray-200 p-3">
                                <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Tipo de ruta</div>
                                <div className="text-sm font-medium">{v.tipo_ruta ? RUTA_LABEL[v.tipo_ruta] || v.tipo_ruta : '—'}</div>
                              </div>
                              <div className="bg-white border border-gray-200 p-3">
                                <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Terreno</div>
                                <div className="text-sm font-medium">{v.terreno ? TERRENO_LABEL[v.terreno] || v.terreno : '—'}</div>
                              </div>
                              <div className="bg-white border border-gray-200 p-3">
                                <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Precio gasoil</div>
                                <div className="text-sm font-medium">{v.precio_combustible ? `$${v.precio_combustible.toLocaleString('es-AR')}/lts` : '—'}</div>
                              </div>
                            </div>

                            {/* Factores IA */}
                            {(v.factor_peso || v.factor_ruta || v.factor_terreno) && (
                              <div className="mb-4">
                                <div className="font-mono text-[8px] text-gray-400 uppercase mb-2">Factores aplicados por la IA</div>
                                <div className="flex gap-2 flex-wrap">
                                  {v.factor_peso && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Peso ×{v.factor_peso}</span>}
                                  {v.factor_ruta && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Ruta ×{v.factor_ruta}</span>}
                                  {v.factor_terreno && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Terreno ×{v.factor_terreno}</span>}
                                  {v.porcentaje_carga !== undefined && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Carga {v.porcentaje_carga}%</span>}
                                </div>
                              </div>
                            )}

                            {/* Rentabilidad */}
                            {v.flete_cobrado && margen && (
                              <div className="mb-4 p-4 border" style={{ backgroundColor: parseFloat(margen) > 0 ? 'rgba(26,107,58,0.06)' : 'rgba(212,68,12,0.06)', borderColor: parseFloat(margen) > 0 ? 'rgba(26,107,58,0.25)' : 'rgba(212,68,12,0.25)' }}>
                                <div className="font-mono text-[8px] text-gray-400 uppercase mb-2">Rentabilidad del flete</div>
                                <div className="flex items-end justify-between">
                                  <div className="text-sm" style={{ color: '#4a4540' }}>
                                    Flete: ${v.flete_cobrado.toLocaleString('es-AR')} · Combustible: ${v.costo_total.toLocaleString('es-AR')}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono text-[8px] uppercase mb-0.5" style={{ color: colorMargen }}>{ganancia! >= 0 ? 'Ganancia' : 'Pérdida'}</div>
                                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 900, color: colorMargen, lineHeight: 1 }}>
                                      {ganancia! >= 0 ? '' : '-'}${Math.abs(Math.round(ganancia!)).toLocaleString('es-AR')}
                                    </div>
                                    <div className="font-mono text-[9px] mt-0.5" style={{ color: colorMargen, opacity: 0.75 }}>{parseFloat(margen) > 0 ? '+' : ''}{margen}% del flete</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Litros reales */}
                            {v.litros_reales && (
                              <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 font-mono text-[10px] text-green-700">
                                ✓ Consumo real registrado: {v.litros_reales} lts · Diferencia: {(v.litros_reales - v.litros_totales).toFixed(1)} lts vs estimado
                              </div>
                            )}

                            {/* Descripción IA */}
                            {v.descripcion_ia && (
                              <div className="mb-4 p-3 bg-white border border-gray-200">
                                <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">🧠 Explicación IA</div>
                                <div className="text-xs text-gray-600 leading-relaxed">{v.descripcion_ia}</div>
                              </div>
                            )}

                            <button
                              onClick={(e) => abrirEdicion(e, v)}
                              className="text-xs font-bold px-3 py-2 border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors"
                            >
                              ✏️ Editar este viaje
                            </button>
                          </div>
                        )}

                        {/* PANEL EDICIÓN */}
                        {editando === v.id && (
                          <div className="px-6 pb-5 pt-4">
                            <div className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-3">// Editar viaje</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">Origen</label>
                                <input
                                  type="text"
                                  value={form.origen}
                                  onChange={e => setForm(f => ({ ...f, origen: e.target.value }))}
                                  placeholder={v.origen || 'Ej: Rosario'}
                                  className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors"
                                />
                              </div>
                              <div>
                                <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">Destino</label>
                                <input
                                  type="text"
                                  value={form.destino}
                                  onChange={e => setForm(f => ({ ...f, destino: e.target.value }))}
                                  placeholder={v.destino || 'Ej: Buenos Aires'}
                                  className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors"
                                />
                              </div>
                              <div>
                                <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">
                                  Litros reales <span style={{ color: '#d4440c' }}>(actualiza IA)</span>
                                </label>
                                <input
                                  type="number"
                                  value={form.litros_reales}
                                  onChange={e => setForm(f => ({ ...f, litros_reales: e.target.value }))}
                                  placeholder={v.litros_reales?.toString() || v.litros_totales.toString()}
                                  min="1" step="0.1"
                                  className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => guardarEdicion(v)}
                                disabled={guardando}
                                className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
                              >
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                              </button>
                              <button
                                onClick={(e) => cerrarEdicion(e)}
                                className="px-4 py-2 text-xs border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                              >
                                Cancelar
                              </button>
                              {mensaje?.id === v.id && (
                                <span className={`font-mono text-[10px] ml-1 ${mensaje.ok ? 'text-green-600' : 'text-red-500'}`}>
                                  {mensaje.texto}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
