'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camion, NuevoCamion } from '@/lib/types';
import Sidebar from '@/app/components/Sidebar';

interface Props {
  camionesIniciales: Camion[];
  empresa: string;
  email: string;
}

// Specs: { modelo: [consumo_lts_100km_vacío, capacidad_ton_referencia] }
// Consumo vacío = referencia del fabricante en ruta mixta/autopista
const SPECS_MODELOS: Record<string, { consumo: number; capacidad: number; motor?: string }> = {
  // Volvo
  'FH 420': { consumo: 28, capacidad: 27, motor: 'D13 420 hp' },
  'FH 460': { consumo: 29, capacidad: 27, motor: 'D13 460 hp' },
  'FH 500': { consumo: 30, capacidad: 27, motor: 'D13 500 hp' },
  'FH 540': { consumo: 31, capacidad: 25, motor: 'D13 540 hp' },
  'FM 370': { consumo: 26, capacidad: 20, motor: 'D11 370 hp' },
  'FM 420': { consumo: 27, capacidad: 20, motor: 'D13 420 hp' },
  'FMX 460': { consumo: 32, capacidad: 22, motor: 'D13 460 hp' },
  // Mercedes-Benz
  'Actros 1845': { consumo: 28, capacidad: 25, motor: 'OM471 449 hp' },
  'Actros 1848': { consumo: 29, capacidad: 25, motor: 'OM471 476 hp' },
  'Actros 2045': { consumo: 30, capacidad: 30, motor: 'OM473 449 hp' },
  'Actros 2648': { consumo: 33, capacidad: 35, motor: 'OM473 476 hp' },
  'Arocs 3348': { consumo: 35, capacidad: 35, motor: 'OM473 476 hp' },
  'Atego 1726': { consumo: 18, capacidad: 10, motor: 'OM934 260 hp' },
  'Axor 2544': { consumo: 31, capacidad: 30, motor: 'OM501 435 hp' },
  // Scania
  'R 410': { consumo: 27, capacidad: 27, motor: 'DC13 410 hp' },
  'R 450': { consumo: 28, capacidad: 27, motor: 'DC13 450 hp' },
  'R 500': { consumo: 29, capacidad: 27, motor: 'DC13 500 hp' },
  'R 560': { consumo: 31, capacidad: 25, motor: 'DC16 560 hp' },
  'S 450': { consumo: 27, capacidad: 27, motor: 'DC13 450 hp' },
  'S 500': { consumo: 28, capacidad: 27, motor: 'DC13 500 hp' },
  'P 360': { consumo: 25, capacidad: 22, motor: 'DC13 360 hp' },
  'G 410': { consumo: 27, capacidad: 25, motor: 'DC13 410 hp' },
  // Kenworth
  'T680 450': { consumo: 29, capacidad: 27, motor: 'PACCAR MX-13 450 hp' },
  'T680 510': { consumo: 31, capacidad: 27, motor: 'PACCAR MX-13 510 hp' },
  'T880 500': { consumo: 32, capacidad: 35, motor: 'PACCAR MX-13 500 hp' },
  'W990 600': { consumo: 35, capacidad: 27, motor: 'Cummins X15 600 hp' },
  // Volkswagen
  'Constellation 17.280': { consumo: 24, capacidad: 14, motor: 'MWM 280 hp' },
  'Constellation 19.360': { consumo: 27, capacidad: 18, motor: 'MWM 360 hp' },
  'Constellation 25.420': { consumo: 29, capacidad: 25, motor: 'MWM 420 hp' },
  'Constellation 31.390': { consumo: 32, capacidad: 30, motor: 'MWM 390 hp' },
  'Meteor 29.520': { consumo: 30, capacidad: 27, motor: 'MAN D26 520 hp' },
  'Meteor 33.520': { consumo: 32, capacidad: 30, motor: 'MAN D26 520 hp' },
  // MAN
  'TGX 18.440': { consumo: 27, capacidad: 25, motor: 'D26 440 hp' },
  'TGX 18.480': { consumo: 28, capacidad: 25, motor: 'D26 480 hp' },
  'TGX 26.440': { consumo: 30, capacidad: 35, motor: 'D26 440 hp' },
  'TGS 26.400': { consumo: 29, capacidad: 30, motor: 'D20 400 hp' },
  'TGM 18.290': { consumo: 20, capacidad: 12, motor: 'D0836 290 hp' },
  // DAF
  'XF 480': { consumo: 27, capacidad: 25, motor: 'PACCAR MX-13 480 hp' },
  'XF 530': { consumo: 29, capacidad: 25, motor: 'PACCAR MX-13 530 hp' },
  'CF 400': { consumo: 26, capacidad: 22, motor: 'PACCAR MX-11 400 hp' },
  // Iveco
  'S-Way 480': { consumo: 27, capacidad: 25, motor: 'Cursor 13 480 hp' },
  'S-Way 570': { consumo: 30, capacidad: 25, motor: 'Cursor 13 570 hp' },
  'X-Way 480': { consumo: 30, capacidad: 28, motor: 'Cursor 13 480 hp' },
  'Eurocargo 170': { consumo: 15, capacidad: 8, motor: 'F4AE 170 hp' },
  // Ford
  'F-MAX 500': { consumo: 28, capacidad: 27, motor: 'Ecotorq 500 hp' },
  'Cargo 2429': { consumo: 25, capacidad: 18, motor: 'Cummins 290 hp' },
};

const MARCAS_MODELOS: Record<string, string[]> = {
  'Volvo':         ['FH 420', 'FH 460', 'FH 500', 'FH 540', 'FM 370', 'FM 420', 'FMX 460'],
  'Mercedes-Benz': ['Actros 1845', 'Actros 1848', 'Actros 2045', 'Actros 2648', 'Arocs 3348', 'Atego 1726', 'Axor 2544'],
  'Scania':        ['R 410', 'R 450', 'R 500', 'R 560', 'S 450', 'S 500', 'P 360', 'G 410'],
  'Kenworth':      ['T680 450', 'T680 510', 'T880 500', 'W990 600'],
  'Volkswagen':    ['Constellation 17.280', 'Constellation 19.360', 'Constellation 25.420', 'Constellation 31.390', 'Meteor 29.520', 'Meteor 33.520'],
  'MAN':           ['TGX 18.440', 'TGX 18.480', 'TGX 26.440', 'TGS 26.400', 'TGM 18.290'],
  'DAF':           ['XF 480', 'XF 530', 'CF 400'],
  'Iveco':         ['S-Way 480', 'S-Way 570', 'X-Way 480', 'Eurocargo 170'],
  'Ford':          ['F-MAX 500', 'Cargo 2429'],
  'Otra':          ['Otro modelo'],
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
  const [editCamion, setEditCamion] = useState<Camion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<NuevoCamion>({
    patente: '',
    patente_semi: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    alias: '',
    tipo_combustible: 'diesel',
    capacidad_max_ton: 45,
    consumo_base_litros: 30,
    condicion: 'excelente',
    carroceria: 'semirremolque',
  });
  const [consumoAutocompletado, setConsumoAutocompletado] = useState(false);

  function handleModeloChange(modelo: string) {
    const specs = SPECS_MODELOS[modelo];
    if (specs) {
      setForm(p => ({
        ...p,
        modelo,
        consumo_base_litros: specs.consumo,
        capacidad_max_ton: specs.capacidad,
      }));
      setConsumoAutocompletado(true);
    } else {
      setForm(p => ({ ...p, modelo }));
      setConsumoAutocompletado(false);
    }
  }

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function resetForm() {
    setForm({
      patente: '', patente_semi: '', marca: '', modelo: '',
      anio: new Date().getFullYear(), alias: '',
      tipo_combustible: 'diesel', capacidad_max_ton: 45,
      consumo_base_litros: 30, condicion: 'excelente',
      carroceria: 'semirremolque',
    });
    setConsumoAutocompletado(false);
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

  function abrirEdicion(c: Camion) {
    setEditCamion(c);
    setForm({
      patente: c.patente,
      patente_semi: (c as any).patente_semi || '',
      marca: c.marca,
      modelo: c.modelo,
      anio: c.anio,
      alias: c.alias || '',
      tipo_combustible: c.tipo_combustible,
      capacidad_max_ton: c.capacidad_max_ton,
      consumo_base_litros: c.consumo_base_litros,
      condicion: c.condicion,
      carroceria: c.carroceria,
    });
    setConsumoAutocompletado(false);
    setError(null);
  }

  async function handleActualizar(e: React.FormEvent) {
    e.preventDefault();
    if (!editCamion) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/camiones/${editCamion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      setCamiones(prev => prev.map(c => c.id === editCamion.id ? data.camion : c));
      setEditCamion(null);
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

      <Sidebar active="camiones" empresa={empresa} email={email} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
                          {(c as any).patente_semi && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>Semi: {(c as any).patente_semi}</div>}
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
                          <div className="flex items-center justify-end gap-0">
                            <button onClick={() => abrirEdicion(c)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278', padding: '4px 10px', border: '1px solid rgba(26,23,20,0.15)', borderRight: 'none' }} className="hover:text-accent hover:bg-orange-50 transition-colors">
                              ✏️ Editar
                            </button>
                            <button onClick={() => setDeleteId(c.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278', padding: '4px 10px', border: '1px solid rgba(26,23,20,0.15)' }} className="hover:text-red-500 hover:bg-red-50 transition-colors">
                              🗑 Eliminar
                            </button>
                          </div>
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
                        {(c as any).patente_semi && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>Semi: {(c as any).patente_semi}</div>}
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
                    <div className="flex items-center gap-0 mt-1">
                      <button onClick={() => abrirEdicion(c)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278', padding: '4px 10px', border: '1px solid rgba(26,23,20,0.15)', borderRight: 'none' }} className="hover:text-accent hover:bg-orange-50 transition-colors">
                        ✏️ Editar
                      </button>
                      <button onClick={() => setDeleteId(c.id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#8a8278', padding: '4px 10px', border: '1px solid rgba(26,23,20,0.15)' }} className="hover:text-red-500 hover:bg-red-50 transition-colors">
                        🗑 Eliminar
                      </button>
                    </div>
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

              {/* IDENTIFICACIÓN */}
              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Identificación</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Patente tractor *</label>
                    <input type="text" value={form.patente} onChange={e => setForm(p => ({ ...p, patente: e.target.value }))} placeholder="ABC-123" required maxLength={8}
                      className="w-full px-3 py-2.5 text-sm font-bold outline-none uppercase"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                      onFocus={e => e.target.style.borderColor = '#d4440c'}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,23,20,0.2)'}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Patente semi / acoplado</label>
                    <input type="text" value={form.patente_semi || ''} onChange={e => setForm(p => ({ ...p, patente_semi: e.target.value }))} placeholder="XYZ-456 (opcional)" maxLength={8}
                      className="w-full px-3 py-2.5 text-sm font-bold outline-none uppercase"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                      onFocus={e => e.target.style.borderColor = '#d4440c'}
                      onBlur={e => e.target.style.borderColor = 'rgba(26,23,20,0.2)'}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Año *</label>
                    <input type="number" value={form.anio} onChange={e => setForm(p => ({ ...p, anio: parseInt(e.target.value) }))} min={1990} max={new Date().getFullYear() + 1} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Alias interno</label>
                    <input type="text" value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} placeholder="ej: El rojo de Córdoba"
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Marca *</label>
                    <select value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value, modelo: '' }))} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    >
                      <option value="">— Seleccioná —</option>
                      {Object.keys(MARCAS_MODELOS).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Modelo *</label>
                    <select value={form.modelo} onChange={e => handleModeloChange(e.target.value)} required disabled={!form.marca}
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none disabled:opacity-40"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    >
                      <option value="">— Seleccioná marca —</option>
                      {(MARCAS_MODELOS[form.marca] || []).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Info del modelo seleccionado */}
                {form.modelo && SPECS_MODELOS[form.modelo] && (
                  <div className="mt-3 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'rgba(26,107,58,0.15)', border: '1px solid rgba(26,107,58,0.5)' }}>
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#0f4023', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px', fontWeight: 700 }}>✓ Specs del fabricante cargados automáticamente</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#0f4023', fontWeight: 600 }}>
                        {SPECS_MODELOS[form.modelo].motor} · {SPECS_MODELOS[form.modelo].consumo} lts/100km vacío · {SPECS_MODELOS[form.modelo].capacidad} ton ref.
                      </div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#0f4023', fontWeight: 600 }}>podés editarlo ↓</div>
                  </div>
                )}
              </div>

              {/* COMBUSTIBLE */}
              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Tipo de combustible</div>
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

              {/* DATOS TÉCNICOS */}
              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Datos técnicos</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>
                      Capacidad máx. (ton) *
                      {consumoAutocompletado && <span style={{ color: '#1a6b3a' }}> ✓ auto</span>}
                    </label>
                    <input type="number" value={form.capacidad_max_ton} onChange={e => setForm(p => ({ ...p, capacidad_max_ton: parseFloat(e.target.value) }))} min={1} max={60} step={0.5} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: `1px solid ${consumoAutocompletado ? 'rgba(26,107,58,0.4)' : 'rgba(26,23,20,0.2)'}` }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>
                      Consumo vacío (lts/100km) *
                      {consumoAutocompletado && <span style={{ color: '#1a6b3a' }}> ✓ auto</span>}
                    </label>
                    <input type="number" value={form.consumo_base_litros} onChange={e => { setForm(p => ({ ...p, consumo_base_litros: parseFloat(e.target.value) })); setConsumoAutocompletado(false); }} min={10} max={60} step={0.5} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: `1px solid ${consumoAutocompletado ? 'rgba(26,107,58,0.4)' : 'rgba(26,23,20,0.2)'}` }}
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

              {/* CONDICIÓN */}
              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Condición actual</div>
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

      {/* Modal editar camión */}
      {editCamion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setEditCamion(null); resetForm(); } }}>
          <div className="bg-white border border-gray-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between z-10" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#d4440c', textTransform: 'uppercase', marginBottom: '2px' }}>Editar vehículo</div>
                <div className="text-base font-bold">{editCamion.patente} — {editCamion.marca} {editCamion.modelo}</div>
              </div>
              <button onClick={() => { setEditCamion(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleActualizar} className="p-6 space-y-5">

              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Identificación</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Patente tractor *</label>
                    <input type="text" value={form.patente} onChange={e => setForm(p => ({ ...p, patente: e.target.value }))} required maxLength={8}
                      className="w-full px-3 py-2.5 text-sm font-bold outline-none uppercase"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Patente semi / acoplado</label>
                    <input type="text" value={form.patente_semi || ''} onChange={e => setForm(p => ({ ...p, patente_semi: e.target.value }))} maxLength={8} placeholder="Opcional"
                      className="w-full px-3 py-2.5 text-sm font-bold outline-none uppercase"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Año *</label>
                    <input type="number" value={form.anio} onChange={e => setForm(p => ({ ...p, anio: parseInt(e.target.value) }))} min={1990} max={new Date().getFullYear() + 1} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Alias interno</label>
                    <input type="text" value={form.alias || ''} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} placeholder="ej: El rojo de Córdoba"
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Marca *</label>
                    <select value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value, modelo: '' }))} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    >
                      {Object.keys(MARCAS_MODELOS).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Modelo *</label>
                    <select value={form.modelo} onChange={e => handleModeloChange(e.target.value)} required disabled={!form.marca}
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none disabled:opacity-40"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    >
                      <option value="">— Seleccioná —</option>
                      {(MARCAS_MODELOS[form.marca] || []).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Tipo de combustible</div>
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
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Datos técnicos</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Capacidad máx. (ton) *</label>
                    <input type="number" value={form.capacidad_max_ton} onChange={e => setForm(p => ({ ...p, capacidad_max_ton: parseFloat(e.target.value) }))} min={1} max={60} step={0.5} required
                      className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                      style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Consumo vacío (lts/100km) *</label>
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
                <div className="mb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#1a1714', textTransform: 'uppercase', fontWeight: 700 }}>Condición actual</div>
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
                <button type="button" onClick={() => { setEditCamion(null); resetForm(); }} className="flex-1 py-3 text-sm font-bold transition-colors hover:bg-gray-100" style={{ border: '1px solid rgba(26,23,20,0.2)', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: '#d4440c' }}>
                  {loading ? 'GUARDANDO...' : '✓ GUARDAR CAMBIOS'}
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

