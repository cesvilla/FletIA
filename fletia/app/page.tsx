'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <Link href="/login" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
        <div className="divider"></div>
        <Link href="/registro" className="accent" onClick={() => setMenuOpen(false)}>⚡ Empezar gratis</Link>
      </div>

      <div className="atmos" aria-hidden="true">
        <div className="horizon-glow"></div>
      </div>

      <div className="truck-bg" aria-hidden="true">
        <img src="/fondo-camion.webp" alt="" />
      </div>

      <div className="shell">
        <nav className="top">
          <Link href="/" className="logo">
            <span><b>Flet</b><span className="ia">IA</span></span>
          </Link>
          <div className="actions">
            <Link href="/login" className="btn ghost">Iniciar sesión</Link>
            <Link href="/registro" className="btn primary">Empezar gratis →</Link>
          </div>
          <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </nav>

        <section className="hero">
          <span className="eyebrow"><span className="dot"></span>INTELIGENCIA ARTIFICIAL PARA TU FLOTA DE CAMIONES.</span>
          <h1 className="hero-title">Calculá el costo real<br/>de cada <em>viaje</em></h1>
          <p className="lead">FletIA calcula cuánto te cuesta cada flete antes de salir. Con IA que aprende de tu camión y te dice si el viaje es rentable — En tiempo real y desde tu Celular o Portátil.</p>
          <div className="cta-row">
            <Link href="/registro" className="btn primary lg">⚡ Empezar gratis — 15 días</Link>
            <Link href="/login" className="btn ghost lg">Ya tengo cuenta</Link>
            <div className="cta-meta">✓ Sin tarjeta &nbsp;·&nbsp; ✓ Cancelás cuando querés</div>
          </div>
          {/* Funcionalidades de la plataforma */}
          <div className="reveal-stagger" style={{ maxWidth: '680px' }}>
            <div style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(240,237,232,0.3)',
              marginBottom: '14px',
            }}>// Todo lo que incluye la plataforma</div>
            <div className="features-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}>
              {[
                { icon: '🗺️', title: 'Mapa de ruta',           desc: 'Trazado visual del recorrido antes de salir' },
                { icon: '🌤️', title: 'Clima en ruta',           desc: 'Pronóstico real por puntos del trayecto' },
                { icon: '🚦', title: 'Tráfico en tiempo real',  desc: 'Demoras e incidentes sobre tu ruta' },
                { icon: '⚡', title: 'Calculadora con IA',      desc: 'Costo exacto según peso, ruta y terreno' },
                { icon: '🤖', title: 'IA que aprende',          desc: 'Se ajusta con los litros reales de cada viaje' },
                { icon: '💰', title: 'Rentabilidad por viaje',  desc: 'Ganancia y margen neto al instante' },
                { icon: '📋', title: 'Historial de viajes',     desc: 'Todos los viajes con filtros y búsqueda' },
                { icon: '🚛', title: 'Exportar por camión',     desc: 'Excel y PDF filtrado por unidad de tu flota' },
                { icon: '📱', title: 'Sin hardware',            desc: 'Funciona desde el celular, sin GPS ni app' },
              ].map((f) => (
                <div key={f.title} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(240,237,232,0.04)',
                  border: '1px solid rgba(240,237,232,0.09)',
                  borderRadius: '10px',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(235,75,21,0.35)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(235,75,21,0.05)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,237,232,0.09)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,237,232,0.04)';
                }}
                >
                  <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#f0ede8', lineHeight: '1.2' }}>{f.title}</div>
                    <div style={{ fontSize: '0.71rem', color: 'rgba(240,237,232,0.38)', lineHeight: '1.3', marginTop: '2px' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="section-head reveal">
            <div>
              <div className="section-tag" style={{color:'rgb(235,75,21)'}}>// Capacidades</div>
              <h2 className="section-title">Todo lo que necesitás para saber si el viaje da.</h2>
            </div>
            <p className="section-sub" style={{color:'rgb(233,230,230)'}}>Seis funciones pensadas para transportistas que no tienen tiempo para planillas.</p>
          </div>
          <div className="feat-grid reveal-stagger">
            <div className="feat"><div className="num">01</div><div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg></div><h3>Cálculo antes del viaje</h3><p>Ingresás origen, destino, peso y terreno. Te devolvemos el costo exacto en combustible antes de arrancar el motor.</p></div>
            <div className="feat"><div className="num">02</div><div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3V7a4 4 0 0 0-4-4Z"/><path d="M9 11h.01M15 11h.01M9 15h6"/></svg></div><h3>IA que aprende</h3><p>Cada viaje que registrás enseña al modelo. Con el tiempo las estimaciones se afinan al consumo real de tu camión.</p></div>
            <div className="feat amber"><div className="num">03</div><div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 1 0 0 7H14.5a3.5 3.5 0 1 1 0 7H7"/></svg></div><h3>Rentabilidad real</h3><p>Comparamos lo que cobrás contra el costo real del flete. Sabés al instante si ganás o perdés plata.</p></div>
            <div className="feat"><div className="num">04</div><div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17V8a2 2 0 0 1 2-2h9v11"/><path d="M14 10h4l3 3v4h-2"/><circle cx="7.5" cy="17.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/></svg></div><h3>Por camión y por ruta</h3><p>Cada unidad tiene su perfil de consumo. La IA aprende cada camión por separado.</p></div>
            <div className="feat"><div className="num">05</div><div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></div><h3>Hecho para tu Empresa</h3><p>Pensado para PyMEs, transportistas independientes y más.</p></div>
            <div className="feat"><div className="num">06</div><div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></div><h3>Sin hardware</h3><p>No necesitás instalar GPS, OBD ni dispositivos. Funciona desde el celular o la PC.</p></div>
          </div>
        </section>

        <section className="section" id="how" style={{paddingBottom:'48px'}}>
          <div className="how">
            <div className="how-copy reveal">
              <div className="section-tag" style={{color:'rgb(250,88,33)'}}>// Cómo funciona</div>
              <h2>Tres datos. Una respuesta clara</h2>
              <p>No hay planillas, no hay hojas de cálculo, no hay magia. Cargás lo que vas a hacer, FletIA hace los números, y vos decidís.</p>
              <div className="how-steps">
                <div className="how-step"><div className="n">1</div><div><div className="t">Cargás el viaje</div><div className="d">Origen, destino, peso y qué camión vas a usar. 15 segundos.</div></div></div>
                <div className="how-step"><div className="n">2</div><div><div className="t">La IA calcula</div><div className="d">Combina distancia, consumo aprendido y precio actual del gasoil.</div></div></div>
                <div className="how-step"><div className="n">3</div><div><div className="t">Decidís con datos</div><div className="d">Te muestra costo, margen y si el flete que te ofrecen conviene.</div></div></div>
              </div>
            </div>
            <div className="console reveal">
              <div className="bar"><span className="dot"></span><span className="dot"></span><span className="dot g"></span><span className="ttl">fletia • nuevo viaje</span></div>
              <div className="body">
                <div><span className="m">&gt;</span> <span className="k">camión</span> · <span className="h">Scania R-450</span></div>
                <div><span className="m">&gt;</span> <span className="k">ruta</span> · <span className="h">Rosario → Bahía Blanca</span></div>
                <div><span className="m">&gt;</span> <span className="k">peso</span> · <span className="h">28.500 kg</span></div>
                <div><span className="m">&gt;</span> <span className="k">terreno</span> · <span className="h">ruta · mixto</span></div>
                <div style={{marginTop:'10px'}}><span className="m">// calculando con 47 viajes previos…</span></div>
                <div className="calc-card">
                  <div className="row"><span className="lbl">Distancia</span><span className="val">782 km</span></div>
                  <div className="row"><span className="lbl">Consumo estimado</span><span className="val">253 L · <span className="a">3,09 km/L</span></span></div>
                  <div className="row"><span className="lbl">Gasoil ($/L)</span><span className="val">$1.187</span></div>
                  <div className="row total"><span className="lbl">Costo combustible</span><span className="val">$300.411</span></div>
                  <span className="rentab">▲ rentable · margen 22%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="planes" style={{paddingTop:'32px',paddingBottom:'80px'}}>
          <div className="section-head reveal" style={{justifyContent:'center',textAlign:'center',flexDirection:'column',alignItems:'center',marginBottom:'48px'}}>
            <div>
              <div className="section-tag">// Planes</div>
              <h2 className="section-title" style={{textAlign:'center'}}>Elegí el plan que se adapta a tu flota</h2>
              <p className="section-sub" style={{textAlign:'center',maxWidth:'520px',margin:'16px auto 0'}}>Desde un camión hasta una flota completa. Empezá gratis y escalá cuando lo necesites.</p>
            </div>
          </div>
          <div className="plans reveal-stagger">
            <div className="plan">
              <div className="pname">Prueba</div>
              <div className="pprice">Gratis</div>
              <div className="psub">15 días completos. Sin tarjeta de crédito.</div>
              <ul className="feats">
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> 1 camión</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Viajes ilimitados</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> IA que aprende</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Reporte de rentabilidad</li>
                <li className="muted"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M6 18L18 6"/></svg> Soporte prioritario</li>
              </ul>
              <Link href="/registro" className="btn ghost lg">Empezar gratis</Link>
            </div>
            <div className="plan featured">
              <span className="ribbon">Recomendado</span>
              <div className="pname">Pro</div>
              <div className="pprice">$40.000<span className="per">/ mes</span></div>
              <div className="psub">Para transportistas y PyMEs que quieren controlar cada flete.</div>
              <ul className="feats">
                <li>Hasta 10 camiones</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Viajes ilimitados</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> IA que aprende por camión</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Reportes y rentabilidad</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Soporte por WhatsApp</li>
              </ul>
              <Link href="/registro" className="btn primary lg">⚡ Empezar ahora</Link>
            </div>
            <div className="plan">
              <div className="pname">TU FLOTA</div>
              <div className="pprice compact">Personalizada</div>
              <div className="psub" style={{textAlign:'center'}}>Para empresas con flotas grandes y necesidades a medida.</div>
              <ul className="feats">
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Camiones ilimitados</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Múltiples usuarios y permisos</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Reportes a medida</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Soporte dedicado</li>
              </ul>
              <a href="mailto:hola@flet-ia.com" className="btn ghost lg">Hablar con ventas</a>
            </div>
          </div>
        </section>

        <footer>
          <div className="foot">
            <div className="made">
              <span>© 2026 FletIA · Todos los derechos reservados.</span>
              <span className="flag" aria-label="Argentina"></span>
              <span>Argentina</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
