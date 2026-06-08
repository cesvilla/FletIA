'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { linkWhatsapp } from '@/lib/whatsapp';

const MapaRuta = dynamic(() => import('@/app/viajes/MapaRuta'), { ssr: false });

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

  // Seguimiento en vivo: token que estamos mirando + última data del chofer.
  const [vivoToken, setVivoToken] = useState<string | null>(null);
  const [vivo, setVivo] = useState<any>(null);
  const [vivoCargando, setVivoCargando] = useState(false);
  const [, setTickVivo] = useState(0);

  // Prefill del WhatsApp del dueño desde localStorage
  useEffect(() => {
    const w = localStorage.getItem('fletia_owner_whatsapp');
    if (w) setMiWhatsapp(w);
  }, []);

  // Polling de la ubicación del chofer cada 15s mientras el modal en vivo está abierto.
  useEffect(() => {
    if (!vivoToken) { setVivo(null); return; }
    let cancel = false;
    const cargar = async () => {
      try {
        const res = await fetch(`/api/ruta-ubicacion?token=${encodeURIComponent(vivoToken)}`);
        const d = await res.json();
        if (!cancel) setVivo(d);
      } catch { /* reintenta en el próximo tick */ }
    };
    setVivoCargando(true);
    cargar().finally(() => { if (!cancel) setVivoCargando(false); });
    const iv = setInterval(cargar, 15000);
    return () => { cancel = true; clearInterval(iv); };
  }, [vivoToken]);

  // Tick de 1s para refrescar el "hace Xs" mientras el modal en vivo está abierto.
  useEffect(() => {
    if (!vivoToken) return;
    const iv = setInterval(() => setTickVivo(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [vivoToken]);

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
        type="button"
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
                <button type="button" onClick={() => setVivoToken(r.token)}
                  style={{ fontSize: 11, padding: '5px 10px', border: '1px solid rgba(26,107,58,0.4)', borderRadius: 5, backgroundColor: '#fff', color: '#1a6b3a', cursor: 'pointer', fontWeight: 700 }}>📍 En vivo</button>
                <a href={`${SITE}/ruta/${r.token}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, padding: '5px 10px', border: '1px solid rgba(26,23,20,0.2)', borderRadius: 5, color: '#1a1714', textDecoration: 'none' }}>Ver</a>
                <button type="button" onClick={() => cerrar(r.token)}
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
                  <button type="button" onClick={resetModal} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#fff', color: '#1a1714', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button type="button" onClick={crear} disabled={creando} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#d4440c', color: '#fff', cursor: creando ? 'default' : 'pointer', fontWeight: 700, opacity: creando ? 0.6 : 1 }}>
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
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(creado.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
                    style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#fff', color: '#1a1714', cursor: 'pointer', fontWeight: 600 }}>
                    {copiado ? '✓ Copiado' : '🔗 Copiar link'}
                  </button>
                  <button type="button" onClick={resetModal} style={{ padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#1a1714', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Listo</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de ubicación en vivo del chofer */}
      {vivoToken && (
        <div onClick={() => setVivoToken(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1a1714' }}>📍 Ubicación en vivo del chofer</h3>
              <button type="button" onClick={() => setVivoToken(null)} style={{ border: 'none', background: 'none', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#8a8278' }}>×</button>
            </div>

            <div style={{ marginBottom: 10, fontSize: 13 }}>
              {vivo?.ubicacion_at ? (
                <span style={{ color: estadoVivo(vivo).color, fontWeight: 600 }}>{estadoVivo(vivo).texto}</span>
              ) : (
                <span style={{ color: '#8a8278' }}>
                  {vivoCargando ? 'Cargando…' : 'El chofer todavía no activó el seguimiento. Pedile que abra el link y toque “📡 Compartir mi ubicación EN VIVO”.'}
                </span>
              )}
            </div>

            {vivo?.snapshot?.polyline?.length > 0 && vivo?.snapshot?.origen && vivo?.snapshot?.destino ? (
              <div style={{ border: '1px solid rgba(26,23,20,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                <MapaRuta
                  polyline={vivo.snapshot.polyline}
                  origen={vivo.snapshot.origen}
                  destino={vivo.snapshot.destino}
                  km={vivo.snapshot.km}
                  posicionChofer={vivo.lat != null && vivo.lon != null ? { lat: vivo.lat, lon: vivo.lon } : null}
                />
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0ede8', borderRadius: 8, fontSize: 13, color: '#8a8278', textAlign: 'center', padding: 16 }}>
                Esperando la primera señal del chofer…
              </div>
            )}
            <div style={{ fontSize: 11, color: '#8a8278', marginTop: 8 }}>Se actualiza solo cada 15 segundos. El chofer tiene que mantener su pantalla abierta.</div>
          </div>
        </div>
      )}
    </>
  );
}

// Texto y color del estado de la ubicación en vivo según cuán reciente sea la señal.
function estadoVivo(v: any): { texto: string; color: string } {
  if (!v?.ubicacion_at) return { texto: 'Sin señal todavía', color: '#8a8278' };
  const seg = Math.max(0, Math.round((Date.now() - new Date(v.ubicacion_at).getTime()) / 1000));
  const hace = seg < 60 ? `hace ${seg}s` : `hace ${Math.round(seg / 60)} min`;
  if (v.tracking_activo && seg < 90) return { texto: `🟢 En vivo · última señal ${hace}`, color: '#1a6b3a' };
  return { texto: `🟠 Última señal ${hace} · el seguimiento puede estar pausado`, color: '#c8860a' };
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
