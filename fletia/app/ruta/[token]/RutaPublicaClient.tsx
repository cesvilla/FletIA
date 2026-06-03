'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { linkWhatsapp } from '@/lib/whatsapp';

const MapaRuta = dynamic(() => import('@/app/viajes/MapaRuta'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, backgroundColor: '#e8e3db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8a8278' }}>Cargando mapa…</span>
    </div>
  ),
});

interface Snapshot {
  origen: { lat: number; lon: number; nombre: string };
  destino: { lat: number; lon: number; nombre: string };
  km: number;
  duracionMin?: number;
  polyline: [number, number][];
  peajes?: { plazas: Array<{ nombre: string; ruta: string; precio: number }>; total: number };
  clima?: { puntos: Array<{ nombre: string; temp: number; condicion: string; emoji: string; viento: number; lluvia: number; impactoPct: number }>; tieneAlertas: boolean };
  trafico?: { disponible: boolean; totalIncidentes: number; demoraTotal: number; cortes: Array<{ tipo: string; emoji: string; zona: string; ubicacion: string }>; resumenTipos: Array<{ tipo: string; emoji: string; cantidad: number }> };
}

interface Data {
  estado: string;
  chofer_nombre?: string;
  owner_whatsapp?: string | null;
  snapshot?: Snapshot;
}

const BG = '#f0ede8';

export default function RutaPublicaClient({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/ruta-publica?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [token]);

  if (error) return <Pantalla emoji="⚠️" titulo="No se pudo cargar la ruta" texto="Probá de nuevo en un momento." />;
  if (!data) return <Pantalla emoji="🛣️" titulo="Cargando tu ruta…" texto="" />;

  if (data.estado === 'inexistente') return <Pantalla emoji="🔍" titulo="Ruta no encontrada" texto="El link no es válido." />;
  if (data.estado === 'finalizada') return <Pantalla emoji="✅" titulo="Viaje finalizado" texto="Esta ruta ya fue cerrada por la empresa." />;
  if (data.estado === 'vencida') return <Pantalla emoji="⌛" titulo="Link vencido" texto="Pedile a la empresa un link nuevo." />;

  const s = data.snapshot!;
  const horas = s.duracionMin ? `${Math.floor(s.duracionMin / 60)}h ${String(s.duracionMin % 60).padStart(2, '0')}m` : null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${s.origen.lat},${s.origen.lon}&destination=${s.destino.lat},${s.destino.lon}&travelmode=driving`;
  const ubicacionMsg = `Hola! Te comparto mi ubicación en vivo del viaje ${s.origen.nombre.split(',')[0]} → ${s.destino.nombre.split(',')[0]}. (Para enviarla: tocá 📎 → Ubicación → Compartir en tiempo real)`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1714', padding: '16px 20px' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
          Flet<span style={{ color: '#d4440c' }}>IA</span>
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginTop: 2 }}>
          // inteligencia para cada viaje
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px' }}>
        {data.chofer_nombre && (
          <div style={{ fontSize: 13, color: '#8a8278', fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>Ruta para</div>
        )}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1714', margin: '0 0 4px' }}>
          {data.chofer_nombre || 'Tu viaje'}
        </h1>
        <div style={{ fontSize: 15, color: '#4a4540', marginBottom: 16 }}>
          {s.origen.nombre.split(',')[0]} → {s.destino.nombre.split(',')[0]}
        </div>

        {/* Mapa */}
        <div style={{ border: '1px solid rgba(26,23,20,0.1)', marginBottom: 12 }}>
          <MapaRuta polyline={s.polyline} origen={s.origen} destino={s.destino} km={s.km} />
        </div>

        {/* Chips resumen */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Chip label="Distancia" valor={`${s.km} km`} />
          {horas && <Chip label="Tiempo est." valor={horas} />}
          {s.peajes?.total ? <Chip label="Peajes" valor={`$${s.peajes.total.toLocaleString('es-AR')}`} /> : null}
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            style={btn('#1a6b3a')}>
            🧭 Navegar con Google Maps
          </a>
          {data.owner_whatsapp && (
            <a href={linkWhatsapp(data.owner_whatsapp, ubicacionMsg)} target="_blank" rel="noopener noreferrer"
              style={btn('#25D366')}>
              📍 Compartir mi ubicación con la empresa
            </a>
          )}
        </div>
        {data.owner_whatsapp && (
          <div style={{ fontSize: 12, color: '#8a8278', backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.08)', padding: '10px 14px', borderRadius: 6, marginBottom: 20, lineHeight: 1.5 }}>
            💡 Para que te sigan en tiempo real: abrí el chat con el botón verde, después tocá <strong>📎 → Ubicación → Compartir en tiempo real</strong> y elegí la duración. Funciona aunque bloquees el celular.
          </div>
        )}

        {/* Peajes */}
        {s.peajes && s.peajes.plazas.length > 0 && (
          <Seccion titulo={`🚧 Peajes en la ruta (${s.peajes.plazas.length})`}>
            {s.peajes.plazas.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < s.peajes!.plazas.length - 1 ? '1px solid rgba(26,23,20,0.06)' : 'none', fontSize: 14 }}>
                <span style={{ color: '#1a1714' }}>{p.nombre} <span style={{ color: '#8a8278', fontSize: 11 }}>· {p.ruta}</span></span>
                <span style={{ fontWeight: 700, color: '#1a1714' }}>${p.precio.toLocaleString('es-AR')}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: '2px solid rgba(26,23,20,0.1)', fontSize: 14, fontWeight: 800 }}>
              <span>Total peajes</span>
              <span style={{ color: '#d4440c' }}>${s.peajes.total.toLocaleString('es-AR')}</span>
            </div>
          </Seccion>
        )}

        {/* Clima */}
        {s.clima && s.clima.puntos.length > 0 && (
          <Seccion titulo="🌤️ Clima en ruta">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {s.clima.puntos.map((p, i) => (
                <div key={i} style={{ backgroundColor: BG, border: '1px solid rgba(26,23,20,0.06)', padding: '10px 12px', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: '#8a8278', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1714' }}>{p.emoji} {p.temp}°</div>
                  <div style={{ fontSize: 11, color: '#4a4540' }}>{p.condicion}</div>
                  {p.impactoPct > 0 && <div style={{ fontSize: 10, color: '#c8860a', marginTop: 2 }}>⚠ +{p.impactoPct}% consumo</div>}
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Tráfico / cortes */}
        {s.trafico?.disponible && (s.trafico.cortes.length > 0 || s.trafico.totalIncidentes > 0) && (
          <Seccion titulo="🚦 Tráfico y cortes">
            {s.trafico.cortes.length > 0 ? (
              s.trafico.cortes.map((c, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < s.trafico!.cortes.length - 1 ? '1px solid rgba(26,23,20,0.06)' : 'none', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: '#d4440c' }}>{c.emoji} {c.tipo}</span>
                  <span style={{ color: '#4a4540' }}> — {c.ubicacion} ({c.zona})</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 14, color: '#4a4540' }}>
                {s.trafico.totalIncidentes} incidente(s) reportado(s) en la ruta. Manejá con precaución.
              </div>
            )}
          </Seccion>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#aaa', letterSpacing: 1 }}>
          FletIA — inteligencia para cada viaje
        </div>
      </div>
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    backgroundColor: color, color: '#fff', padding: '14px', borderRadius: 8,
    fontWeight: 700, fontSize: 15,
  };
}

function Chip({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)', padding: '8px 14px', borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: '#8a8278', fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1714' }}>{valor}</div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)', padding: '14px 16px', borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 1, color: '#1a1714', fontWeight: 700, marginBottom: 10 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Pantalla({ emoji, titulo, texto }: { emoji: string; titulo: string; texto: string }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1714', margin: '0 0 6px' }}>{titulo}</h1>
      {texto && <p style={{ fontSize: 14, color: '#4a4540', margin: 0 }}>{texto}</p>}
      <div style={{ marginTop: 24, fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#aaa', letterSpacing: 1 }}>FletIA</div>
    </div>
  );
}
