'use client';
import { useEffect, useState } from 'react';

interface Acceso {
  id: string;
  user_id: string;
  email: string;
  empresa: string;
  aprobado: boolean;
  dias_demo: number;
  tipo: string;
  fecha_aprobacion: string | null;
  fecha_expiracion: string | null;
  created_at: string;
}

export default function AdminClient() {
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState<Record<string, string>>({});
  const [tipos, setTipos] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const res = await fetch('/api/admin');
    const data = await res.json();
    if (data.accesos) setAccesos(data.accesos);
    setLoading(false);
  }

  async function aprobar(user_id: string) {
    const d = dias[user_id] || '15';
    const t = tipos[user_id] || 'demo';
    setProcesando(user_id);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, dias: parseInt(d), tipo: t }),
    });
    const data = await res.json();
    if (data.ok) {
      setMensaje({ texto: `✓ Aprobado por ${d} días`, tipo: 'ok' });
      cargar();
    } else {
      setMensaje({ texto: `Error: ${data.error}`, tipo: 'error' });
    }
    setProcesando(null);
    setTimeout(() => setMensaje(null), 3000);
  }

  async function revocar(user_id: string) {
    setProcesando(user_id);
    const res = await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
    const data = await res.json();
    if (data.ok) {
      setMensaje({ texto: '✓ Acceso revocado', tipo: 'ok' });
      cargar();
    }
    setProcesando(null);
    setTimeout(() => setMensaje(null), 3000);
  }

  function diasRestantes(fecha: string | null): string {
    if (!fecha) return '—';
    const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'VENCIDO';
    return `${diff} días`;
  }

  function formatFecha(fecha: string | null): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const pendientes = accesos.filter(a => !a.aprobado);
  const activos = accesos.filter(a => a.aprobado && a.fecha_expiracion && new Date(a.fecha_expiracion) > new Date());
  const vencidos = accesos.filter(a => a.aprobado && a.fecha_expiracion && new Date(a.fecha_expiracion) <= new Date());

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a1714', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>
            Flet<span style={{ color: '#d4440c' }}>IA</span> <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)' }}>/ Admin</span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>
            // gestión de accesos y demos
          </div>
        </div>
        <a href="/dashboard" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          → Volver al dashboard
        </a>
      </div>

      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Notificación */}
        {mensaje && (
          <div style={{
            marginBottom: 20, padding: '10px 16px', borderRadius: 6,
            backgroundColor: mensaje.tipo === 'ok' ? 'rgba(26,107,58,0.1)' : 'rgba(212,68,12,0.1)',
            border: `1px solid ${mensaje.tipo === 'ok' ? 'rgba(26,107,58,0.3)' : 'rgba(212,68,12,0.3)'}`,
            color: mensaje.tipo === 'ok' ? '#1a6b3a' : '#d4440c',
            fontFamily: 'DM Mono, monospace', fontSize: 12,
          }}>
            {mensaje.texto}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'PENDIENTES', val: pendientes.length, color: '#c8860a' },
            { label: 'ACTIVOS', val: activos.length, color: '#1a6b3a' },
            { label: 'VENCIDOS', val: vencidos.length, color: '#d4440c' },
          ].map(k => (
            <div key={k.label} style={{ backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)', padding: '20px 24px' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', letterSpacing: '2px', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '3rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#8a8278' }}>Cargando...</div>
        ) : (
          <>
            {/* PENDIENTES */}
            {pendientes.length > 0 && (
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)', marginBottom: 24 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(26,23,20,0.08)', backgroundColor: '#fffbf0' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '2px', color: '#c8860a', fontWeight: 700 }}>
                    ⏳ ESPERANDO APROBACIÓN ({pendientes.length})
                  </div>
                </div>
                {pendientes.map(a => (
                  <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(26,23,20,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1714' }}>{a.empresa || '(sin empresa)'}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a8278', marginTop: 2 }}>{a.email}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#aaa', marginTop: 2 }}>
                        Registrado: {formatFecha(a.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        value={tipos[a.user_id] ?? 'demo'}
                        onChange={e => setTipos(p => ({ ...p, [a.user_id]: e.target.value }))}
                        style={{ padding: '6px 8px', border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 11, outline: 'none', color: tipos[a.user_id] === 'cliente' ? '#1a6b3a' : '#c8860a', fontWeight: 700 }}
                      >
                        <option value="demo">🧪 Demo</option>
                        <option value="cliente">⭐ Cliente</option>
                      </select>
                      <input
                        type="number"
                        min={1} max={365}
                        value={dias[a.user_id] ?? '15'}
                        onChange={e => setDias(p => ({ ...p, [a.user_id]: e.target.value }))}
                        style={{ width: 64, padding: '6px 8px', border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 12, textAlign: 'center', outline: 'none' }}
                      />
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a8278' }}>días</span>
                      <button
                        onClick={() => aprobar(a.user_id)}
                        disabled={procesando === a.user_id}
                        style={{ padding: '8px 16px', backgroundColor: '#1a6b3a', color: '#fff', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: procesando === a.user_id ? 0.5 : 1 }}
                      >
                        {procesando === a.user_id ? '...' : '✓ APROBAR'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ACTIVOS */}
            {activos.length > 0 && (
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)', marginBottom: 24 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(26,23,20,0.08)', backgroundColor: '#f0faf4' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '2px', color: '#1a6b3a', fontWeight: 700 }}>
                    ✅ ACCESOS ACTIVOS ({activos.length})
                  </div>
                </div>
                {activos.map(a => (
                  <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(26,23,20,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1714' }}>{a.empresa || '(sin empresa)'}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a8278', marginTop: 2 }}>{a.email}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#aaa' }}>Vence: {formatFecha(a.fecha_expiracion)}</span>
                        <span style={{ padding: '1px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono, monospace', backgroundColor: a.tipo === 'cliente' ? 'rgba(26,107,58,0.1)' : 'rgba(200,134,10,0.1)', color: a.tipo === 'cliente' ? '#1a6b3a' : '#c8860a' }}>
                          {a.tipo === 'cliente' ? '⭐ cliente' : '🧪 demo'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 800, color: '#1a6b3a' }}>
                          {diasRestantes(a.fecha_expiracion)}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#8a8278' }}>restantes</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <select
                          value={tipos[a.user_id] ?? (a.tipo || 'demo')}
                          onChange={e => setTipos(p => ({ ...p, [a.user_id]: e.target.value }))}
                          style={{ padding: '5px 7px', border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 10, outline: 'none' }}
                        >
                          <option value="demo">🧪 Demo</option>
                          <option value="cliente">⭐ Cliente</option>
                        </select>
                        <input
                          type="number" min={1} max={365}
                          value={dias[a.user_id] ?? '30'}
                          onChange={e => setDias(p => ({ ...p, [a.user_id]: e.target.value }))}
                          style={{ width: 54, padding: '5px 6px', border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'center', outline: 'none' }}
                        />
                        <button
                          onClick={() => aprobar(a.user_id)}
                          disabled={procesando === a.user_id}
                          style={{ padding: '6px 12px', backgroundColor: '#1a6b3a', color: '#fff', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 10, cursor: 'pointer', opacity: procesando === a.user_id ? 0.5 : 1 }}
                        >
                          +días
                        </button>
                        <button
                          onClick={() => revocar(a.user_id)}
                          disabled={procesando === a.user_id}
                          style={{ padding: '6px 12px', backgroundColor: 'rgba(212,68,12,0.1)', color: '#d4440c', border: '1px solid rgba(212,68,12,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 10, cursor: 'pointer' }}
                        >
                          Revocar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VENCIDOS */}
            {vencidos.length > 0 && (
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(26,23,20,0.1)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(26,23,20,0.08)', backgroundColor: '#fff5f5' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '2px', color: '#d4440c', fontWeight: 700 }}>
                    🔒 DEMOS VENCIDAS ({vencidos.length})
                  </div>
                </div>
                {vencidos.map(a => (
                  <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(26,23,20,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', opacity: 0.7 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1714' }}>{a.empresa || '(sin empresa)'}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a8278', marginTop: 2 }}>{a.email}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#d4440c', marginTop: 2 }}>
                        Venció: {formatFecha(a.fecha_expiracion)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number" min={1} max={365}
                        value={dias[a.user_id] ?? '15'}
                        onChange={e => setDias(p => ({ ...p, [a.user_id]: e.target.value }))}
                        style={{ width: 54, padding: '5px 6px', border: '1px solid rgba(26,23,20,0.2)', backgroundColor: '#f0ede8', fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'center', outline: 'none' }}
                      />
                      <button
                        onClick={() => aprobar(a.user_id)}
                        disabled={procesando === a.user_id}
                        style={{ padding: '6px 14px', backgroundColor: '#c8860a', color: '#fff', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Renovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {accesos.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#8a8278' }}>
                No hay usuarios registrados todavía.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
