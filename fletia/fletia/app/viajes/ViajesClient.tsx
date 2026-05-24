'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Camion {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  consumo_base_litros: number;
  capacidad_max_ton: number;
  condicion: string;
}

interface Viaje {
  id: string;
  origen: string | null;
  destino: string | null;
  kilometros: number;
  peso_carga: number;
  costo_total: number;
  litros_totales: number;
  costo_por_km: number;
  porcentaje_carga: number;
  flete_cobrado: number | null;
  litros_reales: number | null;
  created_at: string;
  camiones: { patente: string; marca: string; modelo: string } | null;
}

interface ResultadoIA {
  factorPeso: number;
  factorRuta: number;
  factorTerreno: number;
  consumoReal: number;
  litrosTotales: number;
  costoTotal: number;
  costoPorKm: number;
  porcentajeCarga: number;
  descripcion: string;
}

interface Props {
  camiones: Camion[];
  viajesIniciales: Viaje[];
  empresa: string;
  email: string;
}

export default function ViajesClient({ camiones, viajesIniciales, empresa, email }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [viajes, setViajes] = useState<Viaje[]>(viajesIniciales);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoIA | null>(null);
  const [camionInfo, setCamionInfo] = useState<{ patente: string; marca: string; modelo: string } | null>(null);

  const [form, setForm] = useState({
    camion_id: '',
    origen: '',
    destino: '',
    kilometros: '',
    peso_carga: '',
    tipo_ruta: 'mixta',
    terreno: 'plano',
    precio_combustible: '1200',
    flete_cobrado: '',
  });

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  // Camión seleccionado actualmente
  const camionSeleccionado = camiones.find(c => c.id === form.camion_id);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleCalcular(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    setLoading(true);

    try {
      const res = await fetch('/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kilometros: parseFloat(form.kilometros),
          peso_carga: parseFloat(form.peso_carga),
          precio_combustible: parseFloat(form.precio_combustible),
          flete_cobrado: form.flete_cobrado ? parseFloat(form.flete_cobrado) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al calcular');

      setResultado(data.resultado);
      setCamionInfo(data.camion);

      // Agregar al historial local
      if (data.viaje) {
        setViajes(prev => [data.viaje, ...prev]);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Calcular rentabilidad
  const margenNeto = resultado && form.flete_cobrado
    ? (((parseFloat(form.flete_cobrado) - resultado.costoTotal) / parseFloat(form.flete_cobrado)) * 100).toFixed(1)
    : null;

  const colorMargen = margenNeto
    ? parseFloat(margenNeto) > 25 ? '#1a6b3a'
      : parseFloat(margenNeto) > 10 ? '#c8860a'
      : '#d4440c'
    : '#8a8278';

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
          <a className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-medium" style={{ backgroundColor: 'rgba(212,68,12,0.15)', borderLeft: '2px solid #d4440c' }}>
            <span>🧮</span> Calculadora
          </a>
          <a href="/camiones" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>🚛</span> Mis camiones
          </a>
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Análisis</div>
          <a className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>💰</span> Rentabilidad
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
            <div className="text-sm font-bold">Calculadora IA</div>
            <div className="hidden md:block px-2 py-0.5 rounded-full" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#1a6b3a', backgroundColor: 'rgba(26,107,58,0.1)' }}>
              ● IA activa
            </div>
          </div>
        </div>

        <div className="p-4 md:p-7">

          {/* Sin camiones */}
          {camiones.length === 0 && (
            <div className="bg-white border border-gray-200 border-dashed p-12 text-center">
              <div className="text-5xl mb-4">🚛</div>
              <h2 className="text-2xl font-bold mb-2">Primero registrá un camión</h2>
              <p className="text-sm mb-6" style={{ color: '#8a8278' }}>Para calcular el costo de un viaje necesitás tener al menos un camión registrado.</p>
              <a href="/camiones" className="inline-block text-white px-6 py-3 text-sm font-bold" style={{ backgroundColor: '#d4440c' }}>
                → Ir a mis camiones
              </a>
            </div>
          )}

          {camiones.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* FORMULARIO */}
              <div>
                <form onSubmit={handleCalcular} className="bg-white border border-gray-200">

                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#d4440c', textTransform: 'uppercase', marginBottom: '2px' }}>⚡ Motor IA</div>
                    <div className="text-base font-bold">Calculá tu próximo viaje</div>
                  </div>

                  <div className="p-6 space-y-4">

                    {/* Camión */}
                    <div>
                      <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#8a8278', textTransform: 'uppercase' }}>Camión *</label>
                      <select
                        value={form.camion_id}
                        onChange={e => setForm(p => ({ ...p, camion_id: e.target.value }))}
                        required
                        className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                        style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                      >
                        <option value="">— Seleccioná un camión —</option>
                        {camiones.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.patente} — {c.marca} {c.modelo} ({c.capacidad_max_ton} ton)
                          </option>
                        ))}
                      </select>
                      {camionSeleccionado && (
                        <div className="mt-1.5 text-xs" style={{ fontFamily: 'DM Mono, monospace', color: '#8a8278' }}>
                          Consumo base: {camionSeleccionado.consumo_base_litros} lts/100km · Cond.: {camionSeleccionado.condicion}
                        </div>
                      )}
                    </div>

                    {/* Origen / Destino */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Origen</label>
                        <input
                          type="text"
                          value={form.origen}
                          onChange={e => setForm(p => ({ ...p, origen: e.target.value }))}
                          placeholder="ej: Buenos Aires"
                          className="w-full px-3 py-2.5 text-sm outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Destino</label>
                        <input
                          type="text"
                          value={form.destino}
                          onChange={e => setForm(p => ({ ...p, destino: e.target.value }))}
                          placeholder="ej: Córdoba"
                          className="w-full px-3 py-2.5 text-sm outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                    </div>

                    {/* Km y Peso */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Kilómetros *</label>
                        <input
                          type="number"
                          value={form.kilometros}
                          onChange={e => setForm(p => ({ ...p, kilometros: e.target.value }))}
                          placeholder="ej: 700"
                          required min={1}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>
                          Peso carga (ton) *
                          {camionSeleccionado && (
                            <span style={{ color: '#d4440c' }}> máx {camionSeleccionado.capacidad_max_ton}</span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={form.peso_carga}
                          onChange={e => setForm(p => ({ ...p, peso_carga: e.target.value }))}
                          placeholder="ej: 18"
                          required min={0}
                          max={camionSeleccionado?.capacidad_max_ton}
                          step={0.5}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                    </div>

                    {/* Tipo ruta y terreno */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Tipo de ruta</label>
                        <select
                          value={form.tipo_ruta}
                          onChange={e => setForm(p => ({ ...p, tipo_ruta: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        >
                          <option value="autopista">🛣️ Autopista</option>
                          <option value="mixta">🔀 Mixta</option>
                          <option value="urbana">🏙️ Urbana</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Terreno</label>
                        <select
                          value={form.terreno}
                          onChange={e => setForm(p => ({ ...p, terreno: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        >
                          <option value="plano">➡️ Plano</option>
                          <option value="ondulado">〰️ Ondulado</option>
                          <option value="montanoso">⛰️ Montañoso</option>
                        </select>
                      </div>
                    </div>

                    {/* Precio combustible y flete */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Precio gasoil ($/litro) *</label>
                        <input
                          type="number"
                          value={form.precio_combustible}
                          onChange={e => setForm(p => ({ ...p, precio_combustible: e.target.value }))}
                          required min={1}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase' }}>Flete cobrado ($) <span style={{ color: '#8a8278' }}>opcional</span></label>
                        <input
                          type="number"
                          value={form.flete_cobrado}
                          onChange={e => setForm(p => ({ ...p, flete_cobrado: e.target.value }))}
                          placeholder="Para ver rentabilidad"
                          min={0}
                          className="w-full px-3 py-2.5 text-sm outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="px-3 py-2.5 text-xs" style={{ fontFamily: 'DM Mono, monospace', backgroundColor: 'rgba(212,68,12,0.1)', border: '1px solid rgba(212,68,12,0.3)', color: '#d4440c' }}>
                        ⚠ {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#d4440c' }}
                    >
                      {loading ? '⚡ CALCULANDO...' : '⚡ CALCULAR CON IA'}
                    </button>

                  </div>
                </form>
              </div>

              {/* RESULTADO */}
              <div>
                {!resultado && (
                  <div className="bg-white border border-dashed border-gray-300 p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="text-5xl mb-4">🧮</div>
                    <div className="text-lg font-bold mb-2">Ingresá los datos del viaje</div>
                    <div className="text-sm" style={{ color: '#8a8278' }}>La IA va a calcular el costo exacto en segundos.</div>
                  </div>
                )}

                {resultado && (
                  <div className="space-y-4">

                    {/* Card principal del resultado */}
                    <div className="text-white p-6" style={{ backgroundColor: '#1a1714' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px' }}>
                        ✓ Resultado IA — {camionInfo?.patente} {camionInfo?.marca} {camionInfo?.modelo}
                      </div>

                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '56px', fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: '4px' }}>
                        ${resultado.costoTotal.toLocaleString('es-AR')}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                        costo total en combustible
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        {[
                          { val: `${resultado.litrosTotales} lts`, lab: 'LITROS' },
                          { val: `$${resultado.costoPorKm}`, lab: '$ / KM' },
                          { val: `×${resultado.factorPeso}`, lab: 'FACTOR PESO' },
                        ].map(item => (
                          <div key={item.lab} style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700 }}>{item.val}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginTop: '2px' }}>{item.lab}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rentabilidad */}
                    {margenNeto && (
                      <div className="p-4 border" style={{ backgroundColor: parseFloat(margenNeto) > 0 ? 'rgba(26,107,58,0.08)' : 'rgba(212,68,12,0.08)', borderColor: parseFloat(margenNeto) > 0 ? 'rgba(26,107,58,0.3)' : 'rgba(212,68,12,0.3)' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                          Rentabilidad del flete
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm" style={{ color: '#4a4540' }}>
                            Flete: ${parseFloat(form.flete_cobrado).toLocaleString('es-AR')} · Combustible: ${resultado.costoTotal.toLocaleString('es-AR')}
                          </div>
                          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 900, color: colorMargen }}>
                            {parseFloat(margenNeto) > 0 ? '+' : ''}{margenNeto}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Explicación de la IA */}
                    <div className="p-4 bg-white border border-gray-200">
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                        🧠 Explicación de la IA
                      </div>
                      <p className="text-sm" style={{ color: '#4a4540', lineHeight: '1.6' }}>{resultado.descripcion}</p>
                    </div>

                    {/* Factores aplicados */}
                    <div className="p-4 bg-white border border-gray-200">
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                        Factores aplicados
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Factor peso de carga', val: `×${resultado.factorPeso}`, pct: resultado.porcentajeCarga },
                          { label: 'Factor tipo de ruta', val: `×${resultado.factorRuta}`, pct: (resultado.factorRuta - 1) * 100 },
                          { label: 'Factor terreno', val: `×${resultado.factorTerreno}`, pct: (resultado.factorTerreno - 1) * 100 },
                        ].map(f => (
                          <div key={f.label}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs" style={{ color: '#4a4540' }}>{f.label}</span>
                              <span className="text-xs font-bold" style={{ fontFamily: 'DM Mono, monospace', color: '#d4440c' }}>{f.val}</span>
                            </div>
                            <div style={{ height: '4px', backgroundColor: '#e8e3db', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(f.pct, 100)}%`, backgroundColor: '#d4440c', borderRadius: '2px' }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

         {viajes.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
                <div className="text-sm font-bold">📋 Últimos viajes calculados</div>
              </div>
              <div>
                {viajes.map((v, i) => (
                  <div key={v.id} className="border-b last:border-b-0" style={{ borderColor: 'rgba(26,23,20,0.08)' }}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', marginTop: '2px' }}>
                          {v.camiones?.patente} · {v.peso_carga} ton · estimado: {v.litros_totales} lts
                          {v.litros_reales && <span style={{ color: '#1a6b3a' }}> · real: {v.litros_reales} lts ✓</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700 }}>
                          ${v.costo_total.toLocaleString('es-AR')}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>
                          ${v.costo_por_km}/km
                        </div>
                      </div>
                    </div>
                    {!v.litros_reales && (
                      <LitrosRealesForm viajeId={v.id} onAprendido={(msg) => alert(msg)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LitrosRealesForm({ viajeId, onAprendido }: { viajeId: string; onAprendido: (msg: string) => void }) {
  const [litros, setLitros] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!litros || parseFloat(litros) <= 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/viajes/aprender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viaje_id: viajeId, litros_reales: parseFloat(litros) }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        onAprendido(data.mensaje);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-6 pb-4">
      <input
        type="number"
        value={litros}
        onChange={e => setLitros(e.target.value)}
        placeholder="Litros reales cargados"
        step="0.1" min="1"
        className="px-3 py-1.5 text-xs outline-none flex-1 max-w-[180px]"
        style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
      />
      <button
        type="submit"
        disabled={loading || !litros}
        className="px-3 py-1.5 text-xs text-white font-bold disabled:opacity-50"
        style={{ backgroundColor: '#1a6b3a' }}
      >
        {loading ? '...' : '🧠 Enseñar IA'}
      </button>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>
        ¿Cuánto cargaste realmente?
      </span>
    </form>
  );
}
