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
  excelente: { label: 'Excelente', color: 'text-green-600', dot: '🟢' },
  buena:     { label: 'Buena',     color: 'text-yellow-600', dot: '🟡' },
  regular:   { label: 'Regular',   color: 'text-red-600',  dot: '🔴' },
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

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

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

      setCamiones((prev: Camion[]) => [data.camion, ...prev]);
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
      setCamiones((prev: Camion[]) => prev.filter((c: Camion) => c.id !== id));
      setDeleteId(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  const factorConsumo = 1 + ((form.capacidad_max_ton / 25) * 0.35);
  const consumoCargado = (form.consumo_base_litros * factorConsumo * 1.2).toFixed(1);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

      {/* Sidebar */}
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
          <a href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>⚡</span> Dashboard
          </a>
          <a href="/viajes" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>🧮</span> Nuevo viaje
          </a>
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Flota</div>
          <a className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-medium" style={{ backgroundColor: 'rgba(212,68,12,0.15)', borderLeft: '2px solid #d4440c' }}>
            <span>🚛</span> Mis camiones
          </a>
        </nav>

        <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ backgroundColor: '#d4440c' }}>
              {iniciales}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{empresa}</div>
              <div className="text-white/30 truncate" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px' }}>{email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-left text-white/40 hover:text-red-400 transition-colors" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>
            → Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56">

        {/* Topbar */}
        <div className="px-4 md:px-7 h-14 flex items-center justify-between sticky top-0 z-30 bg-white" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex flex-col gap-1 p-1.5">
              <span className="block w-5 h-0.5 bg-gray-800"></span>
              <span className="block w-5 h-0.5 bg-gray-800"></span>
              <span className="block w-5 h-0.5 bg-gray-800"></span>
            </button>
            <div className="text-sm font-bold">Mis camiones</div>
            <div className="hidden md:flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ fontFamily: 'DM Mono, monospace', color: '#8a8278', backgroundColor: '#e8e3db' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              {camiones.length} activos
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setModalOpen(true); }}
            className="text-white text-xs font-bold px-4 py-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#d4440c' }}
          >
            + Nuevo camión
          </button>
        </div>

        <div className="p-4 md:p-7">

          {/* Sin camiones */}
          {camiones.length === 0 && (
            <div className="bg-white border border-gray-200 border-dashed p-12 text-center">
              <div className="text-5xl mb-4">🚛</div>
              <h2 className="text-2xl font-bold mb-2">Todavía no tenés camiones</h2>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: '#8a8278' }}>
                Registrá tu primer camión para que la IA pueda calcular el consumo exacto de cada viaje.
              </p>
              <button
                onClick={() => { resetForm(); setModalOpen(true); }}
                className="text-white px-6 py-3 text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#d4440c' }}
              >
                + Registrar mi primer camión
              </button>
            </div>
          )}

          {/* Tabla desktop */}
          {camiones.length > 0 && (
            <>
              <div className="hidden md:block bg-white border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#e8e3db', borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
                      {['Patente', 'Vehículo', 'Combustible', 'Capacidad', 'Consumo base', 'Condición', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#8a8278', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {camiones.map((c: Camion) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(26,23,20,0.08)' }} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-base" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{c.patente}</div>
                          {c.alias && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>{c.alias}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{c.marca} {c.modelo}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>{c.anio}</div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#4a4540' }}>{COMBUSTIBLE_LABEL[c.tipo_combustible]}</td>
                        <td className="px-5 py-4">
                          <span className="font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px' }}>{c.capacidad_max_ton}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', marginLeft: '4px' }}>ton</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px' }}>{c.consumo_base_litros}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', marginLeft: '4px' }}>lts/100km</span>
                        </td>
                        <td className="px-5 py-4">
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px' }} className={CONDICION_LABEL[c.condicion]?.color}>
                            {CONDICION_LABEL[c.condicion]?.dot} {CONDICION_LABEL[c.condicion]?.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setDeleteId(c.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278' }} className="hover:text-red-500 transition-colors">
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
                {camiones.map((c: Camion) => (
                  <div key={c.id} className="bg-white border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-xl" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{c.patente}</div>
                        <div className="text-sm" style={{ color: '#4a4540' }}>{c.marca} {c.modelo} · {c.anio}</div>
                      </div>
                      <span>{CONDICION_LABEL[c.condicion]?.dot}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { val: c.capacidad_max_ton, lab: 'TON MÁX' },
                        { val: c.consumo_base_litros, lab: 'LTS/100KM' },
                        { val: COMBUSTIBLE_LABEL[c.tipo_combustible].split(' ')[0], lab: 'COMBUST.' },
                      ].map(item => (
                        <div key={item.lab} className="p-2 text-center" style={{ backgroundColor: '#e8e3db' }}>
                          <div className="font-bold text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{item.val}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#8a8278' }}>{item.lab}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setDeleteId(c.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278' }} className="hover:text-red-500 transition-colors">
                      → Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal nuevo camión */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="bg-white border border-gray-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between z-10" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#d4440c', textTransform: 'uppercase', marginBottom: '2px' }}>Nuevo vehículo</div>
                <div className="text-base font-bold">Registrar camión</div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-5">

              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#8a8278', textTransform: 'uppercase' }}>Identificación</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#8a8278', textTransform: 'uppercase' }}>Patente *</label>
                    <input type="text" value={form.patente} onChange={e => setForm(p => ({ ...p, patente: e.target.value }))} placeholder="ABC-123" required maxLength={8}
                      className="w-full px-3 py-2.5 text-sm font-bold outline-none uppercase"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                      onFocus={e => e.target.style.borderColor = '#d4440c'}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,23,20,0.2)'}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#8a8278', textTransform: 'uppercase' }}>Año *</label>
                    <input type="number" value={form.anio} onChange={e => setForm(p => ({ ...p, anio: parseInt(e.target.value) }))} min={1990} max={new Date().getFullYear() + 1} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#8a8278', textTransform: 'uppercase' }}>Marca *</label>
                    <select value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value, modelo: '' }))} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    >
                      <option value="">— Seleccioná —</option>
                      {Object.keys(MARCAS_MODELOS).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#8a8278', textTransform: 'uppercase' }}>Modelo *</label>
                    <select value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} required disabled={!form.marca}
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none disabled:opacity-40"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    >
                      <option value="">— Seleccioná marca —</option>
                      {(MARCAS_MODELOS[form.marca] || []).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#8a8278', textTransform: 'uppercase' }}>Alias interno</label>
                    <input type="text" value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} placeholder="ej: El rojo de Córdoba"
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#8a8278', textTransform: 'uppercase' }}>Tipo de combustible</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['diesel', 'gnc', 'electrico'] as const).map(tipo => (
                    <button key={tipo} type="button" onClick={() => setForm(p => ({ ...p, tipo_combustible: tipo }))}
                      className="py-3 px-2 text-center text-xs font-bold transition-all"
                      style={{ border: `2px solid ${form.tipo_combustible === tipo ? '#d4440c' : 'rgba(26,23,20,0.2)'}`, backgroundColor: form.tipo_combustible === tipo ? 'rgba(212,68,12,0.08)' : 'transparent', color: form.tipo_combustible === tipo ? '#d4440c' : '#8a8278' }}
                    >
                      {COMBUSTIBLE_LABEL[tipo]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#8a8278', textTransform: 'uppercase' }}>Datos técnicos</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Capacidad máx. (ton) *</label>
                    <input type="number" value={form.capacidad_max_ton} onChange={e => setForm(p => ({ ...p, capacidad_max_ton: parseFloat(e.target.value) }))} min={1} max={50} step={0.5} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Consumo base (lts/100km) *</label>
                    <input type="number" value={form.consumo_base_litros} onChange={e => setForm(p => ({ ...p, consumo_base_litros: parseFloat(e.target.value) }))} min={10} max={60} step={0.5} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                </div>
                {form.consumo_base_litros > 0 && (
                  <div className="mt-3 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#1a1714', color: 'white' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>IA proyecta con carga llena en ruta mixta</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '20px', fontWeight: 700, color: '#d4440c' }}>{consumoCargado} lts/100km</span>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#8a8278', textTransform: 'uppercase' }}>Condición actual</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['excelente', 'buena', 'regular'] as const).map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, condicion: c }))}
                      className="py-3 text-xs font-bold transition-all text-center"
                      style={{ border: `2px solid ${form.condicion === c ? '#d4440c' : 'rgba(26,23,20,0.2)'}`, backgroundColor: form.condicion === c ? 'rgba(212,68,12,0.08)' : 'transparent', color: form.condicion === c ? '#d4440c' : '#8a8278' }}
                    >
                      {CONDICION_LABEL[c].dot} {CONDICION_LABEL[c].label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-3 py-2.5 text-xs" style={{ fontFamily: 'DM Mono, monospace', backgroundColor: 'rgba(212,68,12,0.1)', border: '1px solid rgba(212,68,12,0.3)', color: '#d4440c' }}>
                  ⚠ {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 text-sm font-bold transition-colors hover:bg-gray-100" style={{ border: '1px solid rgba(26,23,20,0.2)', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: '#d4440c' }}>
                  {loading ? 'GUARDANDO...' : '✓ GUARDAR CAMIÓN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold mb-2">¿Eliminar este camión?</h3>
            <p className="text-sm mb-6" style={{ color: '#8a8278' }}>El historial de viajes se conserva pero el camión no aparecerá más en tu flota.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 text-sm font-bold hover:bg-gray-100 transition-colors" style={{ border: '1px solid rgba(26,23,20,0.2)' }}>
                Cancelar
              </button>
              <button onClick={() => handleEliminar(deleteId)} className="flex-1 py-2.5 text-white text-sm font-bold hover:opacity-90 transition-opacity" style={{ backgroundColor: '#d4440c' }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

