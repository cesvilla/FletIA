'use client';

import { useEffect, useRef, useState } from 'react';
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
  ciudades?: string[];
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
  const [ubicando, setUbicando] = useState(false);
  const [ubicError, setUbicError] = useState<string | null>(null);

  // ── Seguimiento en vivo (tracking continuo dentro de FletIA, sin WhatsApp) ──
  const [trackingOn, setTrackingOn] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState<string | null>(null);
  const [ultimaSenal, setUltimaSenal] = useState<number | null>(null);
  const [, setTick] = useState(0); // re-render cada 1s para el "hace Xs"
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/ruta-publica?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [token]);

  // Tick de 1s mientras el seguimiento está activo (para el contador "hace Xs").
  useEffect(() => {
    if (!trackingOn) return;
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [trackingOn]);

  // Al volver a la pestaña (el chofer cambió de app o desbloqueó el celular):
  // si el watch se murió en segundo plano lo reactivamos, y si se soltó el Wake
  // Lock lo volvemos a pedir. Así el seguimiento se reanuda solo, sin que el
  // chofer tenga que tocar nada de nuevo.
  useEffect(() => {
    if (!trackingOn) return;
    const reacquire = async () => {
      if (document.visibilityState !== 'visible') return;
      if (watchIdRef.current === null) { iniciarTracking(); return; }
      if (!wakeLockRef.current && 'wakeLock' in navigator) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch { /* noop */ }
      }
    };
    document.addEventListener('visibilitychange', reacquire);
    return () => document.removeEventListener('visibilitychange', reacquire);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingOn]);

  // Limpieza al desmontar: cortar el watch y soltar el wake lock.
  useEffect(() => () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchIdRef.current);
    try { wakeLockRef.current?.release?.(); } catch { /* noop */ }
  }, []);

  // Auto-reanudar: si el chofer ya había activado el seguimiento (lo guardamos en
  // localStorage), al reabrir el link o cuando el sistema operativo recarga la
  // pestaña que había matado, arranca solo mientras la ruta siga activa. El
  // permiso de ubicación ya quedó dado, así que no vuelve a preguntar.
  useEffect(() => {
    if (data?.estado !== 'activa') return;
    if (trackingOn || watchIdRef.current !== null) return;
    if (typeof window === 'undefined') return;
    try { if (localStorage.getItem(`fletia_track_${token}`) !== '1') return; } catch { return; }
    iniciarTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, token]);

  if (error) return <Pantalla emoji="⚠️" titulo="No se pudo cargar la ruta" texto="Probá de nuevo en un momento." />;
  if (!data) return <Pantalla emoji="🛣️" titulo="Cargando tu ruta…" texto="" />;

  if (data.estado === 'inexistente') return <Pantalla emoji="🔍" titulo="Ruta no encontrada" texto="El link no es válido." />;
  if (data.estado === 'finalizada') return <Pantalla emoji="✅" titulo="Viaje finalizado" texto="Esta ruta ya fue cerrada por la empresa." />;
  if (data.estado === 'vencida') return <Pantalla emoji="⌛" titulo="Link vencido" texto="Pedile a la empresa un link nuevo." />;

  const s = data.snapshot!;
  const horas = s.duracionMin ? `${Math.floor(s.duracionMin / 60)}h ${String(s.duracionMin % 60).padStart(2, '0')}m` : null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${s.origen.lat},${s.origen.lon}&destination=${s.destino.lat},${s.destino.lon}&travelmode=driving`;

  // Captura el GPS del chofer y abre WhatsApp con un PIN real de su posición actual.
  // (WhatsApp no permite iniciar la ubicación por URL, así que mandamos un link de
  // Google Maps con sus coordenadas — que llega clickeable al chat del dueño.)
  function enviarUbicacion() {
    if (!data?.owner_whatsapp) return;
    if (!('geolocation' in navigator)) { setUbicError('Tu celular no permite compartir ubicación.'); return; }
    setUbicando(true);
    setUbicError(null);

    const enviar = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const pin = `https://maps.google.com/?q=${latitude},${longitude}`;
      const msg = `📍 Mi ubicación ahora — viaje ${s.origen.nombre.split(',')[0]} → ${s.destino.nombre.split(',')[0]}\n${pin}`;
      // location.href (no window.open) para que no lo bloquee el navegador móvil.
      window.location.href = linkWhatsapp(data.owner_whatsapp!, msg);
      setUbicando(false);
    };

    const fallar = (err: GeolocationPositionError) => {
      // code 1 = permiso denegado · 2 = posición no disponible · 3 = timeout
      if (err.code === 1) {
        setUbicError('Tenés que permitir el acceso a tu ubicación. Tocá el candado 🔒 al lado de la dirección del navegador y activá "Ubicación".');
      } else if (err.code === 3) {
        setUbicError('Tardó en ubicarte. Activá el GPS del celular, salí a un lugar más abierto y probá de nuevo.');
      } else {
        setUbicError('No pudimos obtener tu ubicación. Activá el GPS del celular y probá de nuevo.');
      }
      setUbicando(false);
    };

    // Estrategia en 2 pasos para que funcione también en interiores y celulares
    // sin señal de GPS fina (y en notebooks sin GPS): primero pedimos una ubicación
    // rápida por red, aceptando una reciente (hasta 2 min). Si esa falla, recién ahí
    // forzamos el GPS de alta precisión con más tiempo de espera.
    navigator.geolocation.getCurrentPosition(
      enviar,
      () => navigator.geolocation.getCurrentPosition(
        enviar,
        fallar,
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
      ),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  }

  // Manda la posición al backend (lo ve el dueño en su mapa en vivo).
  function enviarPos(lat: number, lon: number) {
    fetch('/api/ruta-ubicacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, lat, lon, activo: true }),
      keepalive: true,
    }).then(() => setUltimaSenal(Date.now())).catch(() => { /* reintenta en el próximo tick */ });
  }

  // Arranca el seguimiento continuo: mantiene la pantalla encendida (Wake Lock) y
  // manda el GPS cada ~15s mientras esta página esté abierta.
  async function iniciarTracking() {
    if (!('geolocation' in navigator)) { setTrackingMsg('Tu celular no permite compartir ubicación.'); return; }
    setTrackingMsg(null);
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch { /* sigue sin wake lock */ }
    }
    lastSentRef.current = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (lastSentRef.current === 0 || now - lastSentRef.current >= 15000) {
          lastSentRef.current = now;
          enviarPos(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        if (err.code === 1) {
          setTrackingMsg('Tenés que permitir el acceso a tu ubicación. Tocá el candado 🔒 al lado de la dirección y activá "Ubicación".');
        } else {
          setTrackingMsg('Perdimos tu ubicación. Activá el GPS del celular y mantené esta pantalla abierta.');
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 },
    );
    watchIdRef.current = id;
    setTrackingOn(true);
    try { localStorage.setItem(`fletia_track_${token}`, '1'); } catch { /* noop */ }
  }

  // Detiene el seguimiento y avisa al backend (conserva la última posición).
  function detenerTracking() {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    try { wakeLockRef.current?.release?.(); } catch { /* noop */ }
    wakeLockRef.current = null;
    fetch('/api/ruta-ubicacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, activo: false }),
      keepalive: true,
    }).catch(() => { /* noop */ });
    try { localStorage.removeItem(`fletia_track_${token}`); } catch { /* noop */ }
    setTrackingOn(false);
  }

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
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={btn('#1a6b3a')}>
            🧭 Navegar con Google Maps
          </a>

          {/* Seguimiento en vivo dentro de FletIA (no depende de WhatsApp) */}
          {!trackingOn ? (
            <button onClick={iniciarTracking}
              style={{ ...btn('#d4440c'), border: 'none', width: '100%', cursor: 'pointer' }}>
              📡 Compartir mi ubicación EN VIVO
            </button>
          ) : (
            <div style={{ border: '2px solid #1a6b3a', borderRadius: 8, padding: 14, backgroundColor: '#f1f8f3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#1a6b3a', display: 'inline-block', animation: 'fletia-live 1.4s infinite' }} />
                <strong style={{ color: '#1a6b3a', fontSize: 15 }}>Compartiendo tu ubicación en vivo</strong>
              </div>
              <div style={{ fontSize: 12, color: '#4a4540', marginBottom: 10 }}>
                {ultimaSenal
                  ? `Última señal enviada hace ${Math.max(0, Math.round((Date.now() - ultimaSenal) / 1000))}s. `
                  : 'Obteniendo tu primera ubicación… '}
                Dejá esta pantalla abierta y el celular en el soporte.
              </div>
              <button onClick={detenerTracking}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid rgba(212,68,12,0.4)', backgroundColor: '#fff', color: '#d4440c', fontWeight: 700, cursor: 'pointer' }}>
                ⏹ Detener seguimiento
              </button>
            </div>
          )}
          <style>{`@keyframes fletia-live{0%{box-shadow:0 0 0 0 rgba(26,107,58,0.5)}70%{box-shadow:0 0 0 9px rgba(26,107,58,0)}100%{box-shadow:0 0 0 0 rgba(26,107,58,0)}}`}</style>
        </div>

        {trackingMsg && (
          <div style={{ fontSize: 13, color: '#d4440c', backgroundColor: '#fff5f5', border: '1px solid rgba(212,68,12,0.2)', padding: '10px 14px', borderRadius: 6, marginBottom: 12 }}>
            {trackingMsg}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#8a8278', backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.08)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, lineHeight: 1.5 }}>
          📡 <strong>En vivo:</strong> la empresa ve tu recorrido en tiempo real mientras esta pantalla esté abierta. Si cambiás de app o se bloquea el celular, <strong>se reanuda solo</strong> apenas volvés a esta pantalla. Para que dure todo el viaje sin cortes, poné el celular en el soporte, enchufá el cargador y dejá la pantalla encendida.
        </div>

        {/* Alternativa: pin puntual o ubicación en vivo nativa de WhatsApp */}
        {data.owner_whatsapp && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={enviarUbicacion} disabled={ubicando}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#fff', color: '#1a1714', fontWeight: 600, cursor: ubicando ? 'default' : 'pointer', opacity: ubicando ? 0.7 : 1 }}>
              {ubicando ? '📍 Obteniendo tu ubicación…' : '📲 O mandar un pin por WhatsApp'}
            </button>
            {ubicError && (
              <div style={{ fontSize: 13, color: '#d4440c', backgroundColor: '#fff5f5', border: '1px solid rgba(212,68,12,0.2)', padding: '10px 14px', borderRadius: 6, marginTop: 8 }}>
                {ubicError}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#8a8278', marginTop: 6, lineHeight: 1.5 }}>
              💡 También podés mandar la <strong>ubicación en vivo de WhatsApp</strong> (hasta 8 h, funciona con el celu bloqueado): en ese chat tocá <strong>📎 → Ubicación → Compartir en tiempo real</strong>.
            </div>
          </div>
        )}

        {/* Ciudades del camino */}
        {s.ciudades && s.ciudades.length > 0 && (
          <Seccion titulo={`🛣️ Ciudades en el camino (${s.ciudades.length})`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {s.ciudades.map((c, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    backgroundColor: i === 0 ? '#1a6b3a' : i === s.ciudades!.length - 1 ? '#d4440c' : '#f0ede8',
                    color: i === 0 || i === s.ciudades!.length - 1 ? '#fff' : '#1a1714',
                    border: '1px solid rgba(26,23,20,0.1)', borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: 600,
                  }}>{c}</span>
                  {i < s.ciudades!.length - 1 && <span style={{ color: '#8a8278', fontSize: 14 }}>›</span>}
                </span>
              ))}
            </div>
          </Seccion>
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
