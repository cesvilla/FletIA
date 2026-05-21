'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camion, NuevoCamion } from '@/lib/types';

interface Props {
  camionesIniciales: Camion[];
  empresa: string;
  email: string;
}

const MARCAS_MODELOS: Record<string, string[]> = {
  'Volvo': ['FH', 'FM', 'FMX', 'FE'],
  'Mercedes-Benz': ['Actros', 'Arocs', 'Atego', 'Axor'],
  'Kenworth': ['T680', 'T880', 'W990', 'T270'],
  'Scania': ['R Series', 'S Series', 'P Series', 'G Series'],
  'MAN': ['TGX', 'TGS', 'TGM'],
  'DAF': ['XF', 'CF', 'LF'],
  'Iveco': ['S-Way', 'X-Way', 'Eurocargo'],
  'Ford': ['F-MAX', 'Cargo'],
  'Otra': ['Otro modelo'],
};

const CONDICION_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  excelente: { label: 'Excelente', color: 'text-success', dot: '🟢' },
  buena:     { label: 'Buena',     color: 'text-warning', dot: '🟡' },
  regular:   { label: 'Regular',   color: 'text-accent',  dot: '🔴' },
};

const COMBUSTIBLE_LABEL: Record<string, string> = {
  diesel: '⛽ Diésel',
  gnc: '🔵 GNC/GNL',
  electrico: '⚡ Eléctrico',
};

export default function CamionesClient({ camionesIniciales, empresa, email }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [camiones, setCamiones] = useState<Camion[]>(camionesIniciales);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario
  const [form, setForm] = useState<NuevoCamion>({
    patente: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    alias: '',
    tipo_combustible: 'diesel',
    capacidad_max_ton: 25,
    consumo_base_litros: 30,
    condicion: 'excelente',
    carroceria: 'semirremolque',
  });

  const iniciales = empresa.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function resetForm() {
    setForm({
      patente: '', marca: '', modelo: '',
      anio: new Date().getFullYear(), alias: '',
      tipo_combustible: 'diesel', capacidad_max_ton: 25,
      consumo_base_litros: 30, condicion: 'excelente',
      carroceria: 'semirremolque',
    });
    setError(null);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/camiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      // Agregar al estado local sin recargar
      setCamiones(prev => [data.camion, ...prev]);
      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminar(id: string) {
    try {
      const res = await fetch(`/api/camiones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setCamiones(prev => prev.filter(c => c.id !== id));
      setDeleteId(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  // Cálculo rápido del factor de consumo para preview
  const factorConsumo = 1 + ((form.capacidad_max_ton / 25) * 0.35);
  const consumoCargado = (form.consumo_base_litros * factorConsumo * 1.2).toFixed(1);

  return (
    <div className="flex min-h-screen bg-bg">

      {/* Overlay sidebar mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

      {/* Sidebar */}
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
          <a href="/dashboard" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">⚡</span> Dashboard
          </a>
          <a className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">🧮</span> Nuevo viaje
          </a>
          <a className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
            <span className="w-4 text-center">📋</span> Historial
          </a>
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Flota</div>
          <a className="flex items-center gap-2.5 px-5 py-2.5 text-white text-sm bg-accent/15 border-l-2 border-accent">
            <span className="w-4 text-center">🚛</span> Mis camiones
          </a>
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Análisis</div>
          <a className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors">
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

      {/* Main */}
      <main className="flex-1 md:ml-[220px]">

        {/* Topbar */}
        <div className="bg-card border-b border-ink/10 px-4 md:px-7 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex flex-col gap-1 p-1.5">
              <span className="block w-5 h-0.5 bg-ink"></span>
              <span className="block w-5 h-0.5 bg-ink"></span>
              <span className="block w-5 h-0.5 bg-ink"></span>
            </button>
            <div className="text-sm font-bold">Mis camiones</div>
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[10px] text-ink-3 px-2 py-0.5 bg-surface rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>
              {camiones.length} activos
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setModalOpen(true); }}
            className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors"
          >
            + Nuevo camión
          </button>
        </div>

        <div className="p-4 md:p-7">

          {/* Sin camiones */}
          {camiones.length === 0 && (
            <div className="bg-card border border-ink/10 border-dashed p-12 text-center animate-fade-up">
              <div className="text-5xl mb-4">🚛</div>
              <h2 className="font-display text-2xl font-bold mb-2">Todavía no tenés camiones</h2>
              <p className="text-ink-3 text-sm mb-6 max-w-sm mx-auto">
                Registrá tu primer camión para que la IA pueda calcular el consumo exacto de cada viaje.
              </p>
              <button
                onClick={() => { resetForm(); setModalOpen(true); }}
                className="bg-accent text-white px-6 py-3 text-sm font-bold hover:bg-accent/90 transition-colors"
              >
                + Registrar mi primer camión
              </button>
            </div>
          )}

          {/* Tabla de camiones */}
          {camiones.length > 0 && (
            <div className="animate-fade-up">

              {/* Cards en mobile, tabla en desktop */}
              <div className="hidden md:block bg-card border border-ink/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface border-b border-ink/10">
                      <th className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase text-left px-5 py-3">Patente</th>
                      <th className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase text-left px-5 py-3">Vehículo</th>
                      <th className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase text-left px-5 py-3">Combustible</th>
                      <th className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase text-left px-5 py-3">Capacidad</th>
                      <th className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase text-left px-5 py-3">Consumo base</th>
                      <th className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase text-left px-5 py-3">Condición</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {camiones.map((c, i) => (
                      <tr key={c.id} className="border-b border-ink/10 hover:bg-surface/50 transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                        <td className="px-5 py-4">
                          <div className="font-display text-base font-bold">{c.patente}</div>
                          {c.alias && <div className="font-mono text-[9px] text-ink-3 mt-0.5">{c.alias}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{c.marca} {c.modelo}</div>
                          <div className="font-mono text-[9px] text-ink-3 mt-0.5">{c.anio}</div>
                        </td>
                        <td className="px-5 py-4 text-ink-2">{COMBUSTIBLE_LABEL[c.tipo_combustible]}</td>
                        <td className="px-5 py-4">
                          <span className="font-display font-bold">{c.capacidad_max_ton}</span>
                          <span className="font-mono text-[9px] text-ink-3 ml-1">ton</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-display font-bold">{c.consumo_base_litros}</span>
                          <span className="font-mono text-[9px] text-ink-3 ml-1">lts/100km</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-mono text-[10px] ${CONDICION_LABEL[c.condicion]?.color}`}>
                            {CONDICION_LABEL[c.condicion]?.dot} {CONDICION_LABEL[c.condicion]?.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="font-mono text-[10px] text-ink-3 hover:text-accent transition-colors"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="md:hidden flex flex-col gap-3">
                {camiones.map((c) => (
                  <div key={c.id} className="bg-card border border-ink/10 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-display text-xl font-bold">{c.patente}</div>
                        <div className="text-sm text-ink-2">{c.marca} {c.modelo} · {c.anio}</div>
                      </div>
                      <span className={`font-mono text-[10px] ${CONDICION_LABEL[c.condicion]?.color}`}>
                        {CONDICION_LABEL[c.condicion]?.dot}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-surface p-2 text-center">
                        <div className="font-display font-bold text-lg">{c.capacidad_max_ton}</div>
                        <div className="font-mono text-[8px] text-ink-3">TON MÁX</div>
                      </div>
                      <div className="bg-surface p-2 text-center">
                        <div className="font-display font-bold text-lg">{c.consumo_base_litros}</div>
                        <div className="font-mono text-[8px] text-ink-3">LTS/100KM</div>
                      </div>
                      <div className="bg-surface p-2 text-center">
                        <div className="font-mono text-xs font-bold">{COMBUSTIBLE_LABEL[c.tipo_combustible].split(' ')[0]}</div>
                        <div className="font-mono text-[8px] text-ink-3">COMBUST.</div>
                      </div>
                    </div>
                    <button onClick={() => setDeleteId(c.id)} className="font-mono text-[10px] text-ink-3 hover:text-accent transition-colors">
                      → Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL NUEVO CAMIÓN ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="bg-card border border-ink/20 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-up">

            {/* Header modal */}
            <div className="sticky top-0 bg-card border-b border-ink/10 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <div className="font-mono text-[9px] tracking-[2px] text-accent uppercase mb-0.5">Nuevo vehículo</div>
                <div className="text-base font-bold">Registrar camión</div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-ink-3 hover:text-ink text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-5">

              {/* Identificación */}
              <div>
                <div className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase mb-3">Identificación</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Patente *</label>
                    <input
                      type="text"
                      value={form.patente}
                      onChange={e => setForm(p => ({ ...p, patente: e.target.value }))}
                      placeholder="ABC-123"
                      required
                      maxLength={8}
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-bold outline-none focus:border-accent transition-colors uppercase"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Año *</label>
                    <input
                      type="number"
                      value={form.anio}
                      onChange={e => setForm(p => ({ ...p, anio: parseInt(e.target.value) }))}
                      min={1990} max={2025}
                      required
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-medium outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Marca *</label>
                    <select
                      value={form.marca}
                      onChange={e => setForm(p => ({ ...p, marca: e.target.value, modelo: '' }))}
                      required
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-medium outline-none focus:border-accent transition-colors"
                    >
                      <option value="">— Seleccioná —</option>
                      {Object.keys(MARCAS_MODELOS).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Modelo *</label>
                    <select
                      value={form.modelo}
                      onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                      required
                      disabled={!form.marca}
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-medium outline-none focus:border-accent transition-colors disabled:opacity-40"
                    >
                      <option value="">— Seleccioná marca —</option>
                      {(MARCAS_MODELOS[form.marca] || []).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Alias / Apodo interno</label>
                    <input
                      type="text"
                      value={form.alias}
                      onChange={e => setForm(p => ({ ...p, alias: e.target.value }))}
                      placeholder="ej: El rojo de Córdoba"
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-medium outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Combustible */}
              <div>
                <div className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase mb-3">Tipo de combustible</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['diesel', 'gnc', 'electrico'] as const).map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tipo_combustible: tipo }))}
                      className={`py-3 px-2 border text-center text-xs font-bold transition-all ${form.tipo_combustible === tipo ? 'border-accent bg-accent/10 text-accent' : 'border-ink/20 text-ink-3 hover:border-ink/40'}`}
                    >
                      {COMBUSTIBLE_LABEL[tipo]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacidad y consumo */}
              <div>
                <div className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase mb-3">Datos técnicos (los más importantes para la IA)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Capacidad máx. (ton) *</label>
                    <input
                      type="number"
                      value={form.capacidad_max_ton}
                      onChange={e => setForm(p => ({ ...p, capacidad_max_ton: parseFloat(e.target.value) }))}
                      min={1} max={50} step={0.5}
                      required
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-medium outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] tracking-[1px] text-ink-3 uppercase block mb-1">Consumo base (lts/100km) *</label>
                    <input
                      type="number"
                      value={form.consumo_base_litros}
                      onChange={e => setForm(p => ({ ...p, consumo_base_litros: parseFloat(e.target.value) }))}
                      min={10} max={60} step={0.5}
                      required
                      className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-sm font-medium outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Preview IA */}
                {form.consumo_base_litros > 0 && (
                  <div className="mt-3 bg-ink text-white px-4 py-3 flex items-center justify-between">
                    <div className="font-mono text-[9px] text-white/40 uppercase tracking-wider">IA proyecta con carga llena en ruta mixta</div>
                    <div className="font-display text-lg font-bold text-accent">{consumoCargado} lts/100km</div>
                  </div>
                )}
              </div>

              {/* Condición */}
              <div>
                <div className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase mb-3">Condición operativa actual</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['excelente', 'buena', 'regular'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, condicion: c }))}
                      className={`py-3 border text-xs font-bold transition-all text-center ${form.condicion === c ? 'border-accent bg-accent/10 text-accent' : 'border-ink/20 text-ink-3 hover:border-ink/40'}`}
                    >
                      {CONDICION_LABEL[c].dot} {CONDICION_LABEL[c].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-accent/10 border border-accent/30 text-accent text-xs font-mono px-3 py-2.5">
                  ⚠ {error}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 border border-ink/20 text-sm font-bold text-ink-2 hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'GUARDANDO...' : '✓ GUARDAR CAMIÓN'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINACIÓN ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-ink/20 w-full max-w-sm p-6 animate-fade-up text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold mb-2">¿Eliminar este camión?</h3>
            <p className="text-sm text-ink-3 mb-6">El historial de viajes se va a conservar pero el camión no va a aparecer más en tu flota.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-ink/20 text-sm font-bold hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleEliminar(deleteId)} className="flex-1 py-2.5 bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
