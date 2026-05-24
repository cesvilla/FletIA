import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ backgroundColor: '#0a0e14', minHeight: '100vh', color: '#d6e0ec', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* FONDO ANIMADO */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=DM+Mono:wght@400;500&display=swap');

        @keyframes truck-move {
          0% { transform: translateX(-120%) scaleX(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(120vw) scaleX(1); opacity: 0; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.07; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(212,68,12,0.3); }
          50% { box-shadow: 0 0 80px rgba(212,68,12,0.6); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .truck-anim { animation: truck-move 12s linear infinite; }
        .truck-anim-2 { animation: truck-move 18s linear 6s infinite; }
        .fade-up-1 { animation: fade-up 0.8s ease forwards; }
        .fade-up-2 { animation: fade-up 0.8s ease 0.15s forwards; opacity: 0; }
        .fade-up-3 { animation: fade-up 0.8s ease 0.3s forwards; opacity: 0; }
        .fade-up-4 { animation: fade-up 0.8s ease 0.45s forwards; opacity: 0; }
        .cursor::after { content: '▊'; animation: blink 1s infinite; }
        .btn-glow:hover { animation: glow-pulse 1s ease infinite; }
      `}</style>

      {/* GRID DE FONDO */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(212,68,12,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,68,12,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        animation: 'grid-pulse 4s ease infinite',
        pointerEvents: 'none',
      }} />

      {/* GRADIENTE RADIAL */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(212,68,12,0.12) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* SCANLINE */}
      <div style={{
        position: 'fixed', left: 0, right: 0, height: '2px', zIndex: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,68,12,0.4), transparent)',
        animation: 'scanline 8s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* CAMIONES ANIMADOS */}
      <div style={{ position: 'fixed', bottom: '80px', left: 0, right: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', height: '60px' }}>
        <div className="truck-anim" style={{ position: 'absolute', bottom: 0, fontSize: '48px', lineHeight: 1 }}>
          🚛
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: '140px', left: 0, right: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', height: '40px' }}>
        <div className="truck-anim-2" style={{ position: 'absolute', bottom: 0, fontSize: '32px', lineHeight: 1, opacity: 0.4 }}>
          🚚
        </div>
      </div>

      {/* LÍNEA DE RUTA */}
      <div style={{
        position: 'fixed', bottom: '78px', left: 0, right: 0, height: '2px', zIndex: 0,
        background: 'linear-gradient(90deg, transparent, rgba(212,68,12,0.3) 20%, rgba(212,68,12,0.3) 80%, transparent)',
        pointerEvents: 'none',
      }} />

      {/* CONTENIDO */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* NAV */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px',
          borderBottom: '1px solid rgba(212,68,12,0.15)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(10,14,20,0.8)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            FLET<span style={{ color: '#d4440c' }}>IA</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'rgba(212,68,12,0.6)', marginLeft: '8px', letterSpacing: '2px' }}>v1.0</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/login" style={{ padding: '8px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontFamily: 'DM Mono, monospace', letterSpacing: '1px' }}>
              INGRESAR
            </Link>
            <Link href="/registro" className="btn-glow" style={{
              padding: '10px 24px', fontSize: '13px', backgroundColor: '#d4440c',
              color: 'white', textDecoration: 'none', fontWeight: 900,
              fontFamily: 'DM Mono, monospace', letterSpacing: '1px',
              border: '1px solid rgba(212,68,12,0.5)',
            }}>
              EMPEZAR GRATIS →
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '120px 32px 100px', textAlign: 'center' }}>

          <div className="fade-up-1" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', marginBottom: '32px',
            border: '1px solid rgba(212,68,12,0.4)',
            backgroundColor: 'rgba(212,68,12,0.08)',
            fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '3px', color: '#d4440c',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d4440c', display: 'inline-block', boxShadow: '0 0 8px #d4440c' }}></span>
            SISTEMA ACTIVO · IA EN LÍNEA
          </div>

          <h1 className="fade-up-2" style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 'clamp(52px, 10vw, 110px)',
            fontWeight: 900, lineHeight: 0.9,
            letterSpacing: '-3px', marginBottom: '28px', color: 'white',
          }}>
            CALCULÁ EL<br />
            <span style={{ color: '#d4440c', textShadow: '0 0 40px rgba(212,68,12,0.5)' }}>COSTO REAL</span><br />
            DE CADA VIAJE
          </h1>

          <p className="fade-up-3" style={{
            fontSize: '17px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7,
            maxWidth: '560px', margin: '0 auto 48px',
            fontFamily: 'DM Mono, monospace',
          }}>
            // IA que aprende de tu camión · Cálculo por peso · Rentabilidad por flete · Hecho para transportistas argentinos
          </p>

          <div className="fade-up-4" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro" className="btn-glow" style={{
              padding: '18px 44px', backgroundColor: '#d4440c', color: 'white',
              fontWeight: 900, fontSize: '15px', textDecoration: 'none',
              fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '2px',
              border: '1px solid rgba(212,68,12,0.6)',
            }}>
              ⚡ EMPEZAR GRATIS — 30 DÍAS
            </Link>
            <Link href="/login" style={{
              padding: '18px 44px', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: '14px', textDecoration: 'none',
              fontFamily: 'DM Mono, monospace', letterSpacing: '1px',
            }}>
              YA TENGO CUENTA →
            </Link>
          </div>

          {/* STATS */}
          <div style={{ display: 'flex', gap: '0', justifyContent: 'center', marginTop: '80px', border: '1px solid rgba(212,68,12,0.15)' }}>
            {[
              { val: '$0', lab: 'COSTO DE ARRANQUE' },
              { val: '30s', lab: 'PARA CALCULAR UN VIAJE' },
              { val: '100%', lab: 'SIN HARDWARE' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: '24px 16px', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(212,68,12,0.15)' : 'none',
                backgroundColor: 'rgba(212,68,12,0.03)',
              }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '36px', fontWeight: 900, color: '#d4440c' }}>{s.val}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{s.lab}</div>
              </div>
            ))}
          </div>
        </section>

        {/* BENEFICIOS */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 32px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '4px', color: 'rgba(212,68,12,0.6)', textAlign: 'center', marginBottom: '48px' }}>
            // MÓDULOS DEL SISTEMA
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', backgroundColor: 'rgba(212,68,12,0.1)' }}>
            {[
              { icon: '🧮', title: 'CÁLCULO PRE-VIAJE', desc: 'Ingresás origen, destino y peso. La IA calcula el costo exacto en combustible antes de salir.' },
              { icon: '🧠', title: 'IA ADAPTATIVA', desc: 'Cada viaje real que cargás ajusta el modelo. Con el tiempo, las estimaciones son tuyas.' },
              { icon: '💰', title: 'RENTABILIDAD REAL', desc: 'Comparamos el flete cobrado contra el costo. Sabés al instante si el viaje cierra.' },
              { icon: '🚛', title: 'PERFIL POR CAMIÓN', desc: 'Cada camión tiene su propio modelo de consumo. La IA aprende individualmente.' },
              { icon: '🇦🇷', title: 'PARA ARGENTINA', desc: 'Precio en pesos, soporte en español, pensado para flotas de 2 a 15 camiones.' },
              { icon: '📡', title: 'SIN HARDWARE', desc: 'Cero instalaciones. Funciona desde el celular o la PC. Solo datos, no dispositivos.' },
            ].map((b, i) => (
              <div key={i} style={{
                backgroundColor: '#0d1219', padding: '36px 28px',
                borderTop: '2px solid transparent',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderTopColor = '#d4440c')}
                onMouseLeave={e => (e.currentTarget.style.borderTopColor = 'transparent')}
              >
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{b.icon}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '20px', fontWeight: 700, color: 'white', letterSpacing: '1px', marginBottom: '10px' }}>{b.title}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PRECIO */}
        <section style={{ maxWidth: '560px', margin: '0 auto', padding: '60px 32px' }}>
          <div style={{
            border: '1px solid rgba(212,68,12,0.3)', padding: '48px 40px',
            backgroundColor: 'rgba(212,68,12,0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #d4440c, transparent)' }} />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '4px', color: 'rgba(212,68,12,0.6)', marginBottom: '20px' }}>// PRECIO</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '80px', fontWeight: 900, color: 'white', lineHeight: 1 }}>GRATIS</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '36px', marginTop: '8px' }}>30 DÍAS COMPLETOS · SIN TARJETA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
              {['Camiones ilimitados', 'Viajes ilimitados', 'IA que aprende por camión', 'Reporte de rentabilidad', 'Soporte en español'].map((f, i) => (
                <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#d4440c', fontWeight: 700 }}>→</span> {f}
                </div>
              ))}
            </div>
            <Link href="/registro" style={{
              display: 'block', padding: '18px', backgroundColor: '#d4440c',
              color: 'white', fontWeight: 900, fontSize: '16px', textDecoration: 'none',
              textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '2px',
            }}>
              ⚡ EMPEZAR GRATIS AHORA
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{
          textAlign: 'center', padding: '40px 32px 100px',
          borderTop: '1px solid rgba(212,68,12,0.1)',
          fontFamily: 'DM Mono, monospace', fontSize: '11px',
          color: 'rgba(255,255,255,0.15)', letterSpacing: '2px',
        }}>
          FLETIA © 2025 · HECHO EN ARGENTINA 🇦🇷 · SISTEMA v1.0
        </footer>

      </div>
    </main>
  );
}