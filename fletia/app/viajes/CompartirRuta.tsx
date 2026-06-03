'use client';

import { useEffect, useState } from 'react';
import { linkWhatsapp } from '@/lib/whatsapp';

interface MapaData {
  polyline: [number, number][];
  origen: { lat: number; lon: number; nombre: string };
  destino: { lat: number; lon: number; nombre: string };
  km: number;
  duracionMin?: number;
  peajes?: { plazas: Array<{ nombre: string; ruta: string; precio: number }>; total: number };
}

interface Props {
  mapaData: MapaData | null;
  climaRuta: any;
  traficoRuta: any;
}

interface RutaItem {
  token: string;
  chofer_nombre: string;
  chofer_celular: string | null;
  estado: string;
  vencida: boolean;
  origen: string;
  destino: string;
  km: number;
  created_at: string;
}

const SITE = typeof window !== 'undefined' ? window.location.origin : '';

export default function CompartirRuta({ mapaData, climaRuta, traficoRuta }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [miWhatsapp, setMiWhatsapp] = useState('');
  const [creando, setCreando] = useState(false);
  const [creado, setCreado] = useState<{ url: string; nombre: string; celular: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rutas, setRutas] = useState<RutaItem[]>([]);
  const [copiado, setCopiado] = useState(false);

  // Prefill del WhatsApp del dueño desde localStorage
  useEffect(() => {
    const w = localStorage.getItem('fletia_owner_whatsapp');
    if (w) setMiWhatsapp(w);
  }, []);

  async function cargarRutas() {
    try {
      const res = await fetch('/api/ruta-compartida');
      const data = await res.json();
      if (data.rutas) setRutas(data.rutas);
    } catch { /* noop */ }
  }
  useEffect(() => { cargarRutas(); }, []);

  async function crear() {
    setError(null);
    if (!nombre.trim()) { setError('Ingresá el nombre del chofer'); return; }
    if (!mapaData?.polyline?.length) { setError('Primero calculá una ruta'); return; }
    setCreando(true);

    // Ciudades del camino (una sola vez; se guarda en el snapshot)
    let ciudades: string[] = [];
    try {
      const rc = await fetch('/api/ciudades-ruta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polyline: mapaData.polyline,
          origenNombre: mapaData.origen.nombre,
          destinoNombre: mapaData.destino.nombre,
        }),
      });
      const jc = await rc.json();
      ciudades = jc.ciudades || [];
    } catch { /* si falla, el link igual se crea sin la lista */ }

    const snapshot = {
      origen: mapaData.origen,
      destino: mapaData.destino,
      km: mapaData.km,
      duracionMin: mapaData.duracionMin,
      polyline: mapaData.polyline,
      peajes: mapaData.peajes,
      ciudades,
      clima: climaRuta ? {
        puntos: (climaRuta.puntos || []).map((p: any) => ({
          nombre: p.nombre, temp: p.temp, condicion: p.condicion, emoji: p.emoji,
          viento: p.viento, lluvia: p.lluvia, impactoPct: p.impactoPct,
        })),
        tieneAlertas: climaRuta.tieneAlertas,
      } : undefined,
      trafico: traficoRuta ? {
        disponible: traficoRuta.disponible,
        totalIncidentes: traficoRuta.totalIncidentes,
        demoraTotal: traficoRuta.demoraTotal,
        cortes: traficoRuta.cortes || [],
        resumenTipos: traficoRuta.resumenTipos || [],
      } : undefined,
    };

    try {
      const res = await fetch('/api/ruta-compartida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chofer_nombre: nombre, chofer_celular: celular, owner_whatsapp: miWhatsapp, snapshot }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear el link'); setCreando(false); return; }
      if (miWhatsapp.trim()) localStorage.setItem('fletia_owner_whatsapp', miWhatsapp.trim());
      setCreado({ url: data.url, nombre: nombre.trim(), celular: celular.trim() });
      cargarRutas();
    } catch {
      setError('Error de red. Probá de nuevo.');
    }
    setCreando(false);
  }

  async function cerrar(token: string) {
    await fetch('/api/ruta-compartida', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    cargarRutas();
  }

  function resetModal() {
    setAbierto(false);
    setCreado(null);
    setNombre('');
    setCelular('');
    setError(null);
    setCopiado(false);
  }

  const activas = rutas.filter(r => r.estado === 'activa' && !r.vencida);

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        disabled={!mapaData}
        style={{
          width: '100%', padding: '12px', marginTop: 10, borderRadius: 8, border: 'none',
          backgroundColor: mapaData ? '#1a1714' : '#cfc9bf', color: '#fff',
          fontWeight: 700, fontSize: 14, cursor: mapaData ? 'pointer' : 'not-allowed',
        }}
      >
        📤 Compartir ruta con el chofer
      </button>
      {!mapaData && (
        <div style={{ fontSize: 11, color: '#8a8278', textAlign: 'center', marginTop: 4 }}>
          Calculá una ruta para poder compartirla
        </div>
      )}

      {/* Lista de rutas activas */}
      {activas.length > 0 && (
        <div style={{ marginTop: 14, backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1, color: '#8a8278', marginBottom: 8 }}>
            RUTAS COMPARTIDAS ACTIVAS ({activas.length})
          </div>
          {activas.map(r => (
            <div key={r.token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(26,23,20,0.05)', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1714' }}>{r.chofer_nombre}{r.chofer_celular ? ` · ${r.chofer_celular}` : ''}</div>
                <div style={{ fontSize: 11, color: '#8a8278', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.origen.split(',')[0]} → {r.destino.split(',')[0]} · {r.km} km
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <a href={`${SITE}/ruta/${r.token}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, padding: '5px 10px', border: '1px solid rgba(26,23,20,0.2)', borderRadius: 5, color: '#1a1714', textDecoration: 'none' }}>Ver</a>
                <button onClick={() => cerrar(r.token)}
                  style={{ fontSize: 11, padding: '5px 10px', border: '1px solid rgba(212,68,12,0.3)', borderRadius: 5, backgroundColor: '#fff', color: '#d4440c', cursor: 'pointer' }}>Cerrar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {abierto && (
        <div onClick={resetModal} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 24, maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {!creado ? (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#1a1714' }}>Compartir ruta con el chofer</h3>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8a8278' }}>
                  El chofer verá mapa, peajes, clima y tráfico — sin costos ni rentabilidad. El link vence en 24 h.
                </p>

                <Campo label="Nombre completo del chofer *">
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan Pérez"
                    style={inputStyle} />
                </Campo>
                <Campo label="Celular del chofer (para mandarle el link)">
                  <input value={celular} onChange={e => setCelular(e.target.value)} placeholder="11 2345-6789" inputMode="tel"
                    style={inputStyle} />
                </Campo>
                <Campo label="Tu WhatsApp (para que el chofer te comparta su ubicación)">
                  <input value={miWhatsapp} onChange={e => setMiWhatsapp(e.target.value)} placeholder="11 9876-5432" inputMode="tel"
                    style={inputStyle} />
                </Campo>

                {error && <div style={{ color: '#d4440c', fontSize: 13, marginBottom: 12 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={resetModal} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#fff', color: '#1a1714', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button onClick={crear} disabled={creando} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#d4440c', color: '#fff', cursor: creando ? 'default' : 'pointer', fontWeight: 700, opacity: creando ? 0.6 : 1 }}>
                    {creando ? 'Generando…' : 'Generar link'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>✅</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#1a1714', textAlign: 'center' }}>Link listo para {creado.nombre}</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8a8278', textAlign: 'center' }}>Mandáselo al chofer por WhatsApp.</p>

                <div style={{ backgroundColor: '#f0ede8', padding: '10px 12px', borderRadius: 6, fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#4a4540', wordBreak: 'break-all', marginBottom: 12 }}>
                  {creado.url}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {creado.celular && (
                    <a href={linkWhatsapp(creado.celular, `Hola ${creado.nombre}! Esta es la ruta de tu viaje 🚛 ${creado.url}`)} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', backgroundColor: '#25D366', color: '#fff', padding: 12, borderRadius: 8, fontWeight: 700 }}>
                      📲 Enviar al chofer por WhatsApp
                    </a>
                  )}
                  <button onClick={() => { navigator.clipboard?.writeText(creado.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
                    style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#fff', color: '#1a1714', cursor: 'pointer', fontWeight: 600 }}>
                    {copiado ? '✓ Copiado' : '🔗 Copiar link'}
                  </button>
                  <button onClick={resetModal} style={{ padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#1a1714', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Listo</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(26,23,20,0.2)',
  fontSize: 14, color: '#1a1714', boxSizing: 'border-box',
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#4a4540', marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}
