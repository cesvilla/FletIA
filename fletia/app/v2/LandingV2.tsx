'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type LenisClass from 'lenis';
import type { SceneAPI } from './TruckScene';

const CAPACIDADES = [
  { n: '01', t: 'Cálculo antes del viaje', d: 'Ingresás origen, destino, peso y camión. Te devolvemos el costo real del flete —combustible, peajes y más— antes de arrancar el motor.' },
  { n: '02', t: 'IA que aprende', d: 'Cada viaje que registrás enseña al modelo. Con el tiempo las estimaciones se afinan al consumo real de tu camión.' },
  { n: '03', t: 'Rentabilidad real', d: 'Comparamos lo que cobrás contra el costo real del flete. Sabés al instante si ganás o perdés plata.' },
  { n: '04', t: 'Por camión y por ruta', d: 'Cada unidad tiene su perfil de consumo. La IA aprende cada camión por separado.' },
  { n: '05', t: 'Hecho para tu empresa', d: 'Pensado para PyMEs, transportistas independientes y más.' },
  { n: '06', t: 'Sin hardware', d: 'No necesitás instalar GPS, OBD ni dispositivos. Funciona desde el celular o la PC.' },
];

const FEATURES = [
  { icon: '🗺️', title: 'Mapa de ruta', desc: 'Trazado visual del recorrido antes de salir' },
  { icon: '🌤️', title: 'Clima en ruta', desc: 'Pronóstico real por puntos del trayecto' },
  { icon: '🚦', title: 'Tráfico en tiempo real', desc: 'Demoras e incidentes sobre tu ruta' },
  { icon: '📡', title: 'Seguimiento del chofer', desc: 'Compartís la ruta y lo seguís en vivo en el mapa' },
  { icon: '⚡', title: 'Calculadora con IA', desc: 'Costo exacto según peso, ruta y terreno' },
  { icon: '🤖', title: 'IA que aprende', desc: 'Se ajusta con los litros reales de cada viaje' },
  { icon: '💰', title: 'Rentabilidad por viaje', desc: 'Ganancia y margen neto al instante' },
  { icon: '📋', title: 'Historial de viajes', desc: 'Todos los viajes con filtros y búsqueda' },
  { icon: '🚛', title: 'Exportar por camión', desc: 'Excel y PDF filtrado por unidad de tu flota' },
  { icon: '📱', title: 'Sin hardware', desc: 'Funciona desde el celular, sin GPS ni app' },
];

const FAQ = [
  { q: '¿Necesito instalar un GPS o algún equipo?', a: 'No. FletIA funciona desde el celular o la computadora, sin instalar ningún hardware. Cargás el viaje y listo.' },
  { q: 'Tengo un solo camión, ¿me sirve igual?', a: 'Sí. Probás 15 días gratis con 1 camión, sin tarjeta. Cada unidad tiene su propio perfil de consumo que la IA va aprendiendo.' },
  { q: '¿De dónde sale el precio del gasoil?', a: 'Se actualiza solo con datos oficiales de la Secretaría de Energía, por estación de servicio. No tenés que cargar nada a mano.' },
  { q: '¿Puedo seguir al chofer durante el viaje?', a: 'Sí. Generás un link, se lo mandás por WhatsApp y seguís su ubicación en vivo en el mapa, sin que instale ninguna app.' },
  { q: '¿Mis datos están seguros?', a: 'Sí. Cada cuenta ve únicamente su propia información — tus camiones, viajes y costos no los ve nadie más.' },
  { q: '¿Hay permanencia? ¿Puedo cancelar cuando quiera?', a: 'No hay permanencia. Cancelás cuando quieras y dejás de pagar. Sin letra chica.' },
];

function LogoMark() {
  return (
    <svg width="34" height="24" viewBox="0 0 84 60" aria-hidden="true" style={{ color: '#eb4b15', flexShrink: 0 }}>
      <path fill="currentColor" d="M8,18 H48 V44 H8 Z M50,26 H64 L72,35 V44 H50 Z" />
      <path fill="currentColor" fillRule="evenodd" d="M20,39 a7,7 0 1,0 0,14 a7,7 0 1,0 0,-14 Z M20,43 a3,3 0 1,1 0,6 a3,3 0 1,1 0,-6 Z" />
      <path fill="currentColor" fillRule="evenodd" d="M60,39 a7,7 0 1,0 0,14 a7,7 0 1,0 0,-14 Z M60,43 a3,3 0 1,1 0,6 a3,3 0 1,1 0,-6 Z" />
      <circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="20" cy="8" r="2.6" fill="currentColor" /><circle cx="28" cy="4" r="3.2" fill="currentColor" />
    </svg>
  );
}

export default function LandingV2() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneAPI | null>(null);
  const [enable3D, setEnable3D] = useState(false);

  useEffect(() => {
    let disposed = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cores = navigator.hardwareConcurrency || 8;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8;
    const mobile = /Mobi|Android/i.test(navigator.userAgent);
    const lowEnd = mobile && (cores <= 4 || mem <= 4);
    const use3D = !reduce && !lowEnd && typeof WebGLRenderingContext !== 'undefined';
    setEnable3D(use3D);

    let cleanup = () => {};

    (async () => {
      const gsapMod = await import('gsap');
      const gsap = gsapMod.default || gsapMod.gsap;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      // --- Scroll suave (Lenis) salvo prefers-reduced-motion ---
      let lenis: LenisClass | null = null;
      if (!reduce) {
        const Lenis = (await import('lenis')).default;
        lenis = new Lenis({ duration: 1.1, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis!.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // --- Escena 3D (solo en equipos capaces) ---
      if (use3D && canvasRef.current && !disposed) {
        const { createTruckScene } = await import('./TruckScene');
        if (disposed) return;
        const scene = createTruckScene(canvasRef.current);
        sceneRef.current = scene;
        const onResize = () => scene.resize();
        const onPointer = (e: PointerEvent) => {
          scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('pointermove', onPointer);
        ScrollTrigger.create({
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self: { progress: number }) => scene.setProgress(self.progress),
        });
        const prevCleanup = cleanup;
        cleanup = () => {
          prevCleanup();
          window.removeEventListener('resize', onResize);
          window.removeEventListener('pointermove', onPointer);
          scene.dispose();
        };
      }

      // --- Globo de red (sección "Red inteligente") ---
      if (use3D && globeRef.current && !disposed) {
        const { createGlobeScene } = await import('./GlobeScene');
        if (!disposed && globeRef.current) {
          const g = createGlobeScene(globeRef.current);
          const onGResize = () => g.resize();
          window.addEventListener('resize', onGResize);
          const prevG = cleanup;
          cleanup = () => { prevG(); window.removeEventListener('resize', onGResize); g.dispose(); };
        }
      }

      // --- Reveals cinematográficos ---
      const ctx = gsap.context(() => {
        if (reduce) {
          gsap.set('.r, .r-stagger > *', { opacity: 1, y: 0 });
        } else {
          gsap.utils.toArray<HTMLElement>('.r').forEach((el) => {
            gsap.from(el, {
              y: 48, opacity: 0, duration: 1.0, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 86%' },
            });
          });
          gsap.utils.toArray<HTMLElement>('.r-stagger').forEach((grp) => {
            gsap.from(grp.children, {
              y: 36, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07,
              scrollTrigger: { trigger: grp, start: 'top 84%' },
            });
          });
          // Título del hero: revelado por palabra al cargar
          gsap.from('.v2-title .w', {
            yPercent: 110, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.15,
          });
          gsap.from('.v2-hero .v2-onload', {
            y: 30, opacity: 0, duration: 1.0, ease: 'power3.out', stagger: 0.12, delay: 0.6,
          });
        }
      });

      const prev2 = cleanup;
      cleanup = () => {
        prev2();
        ctx.revert();
        ScrollTrigger.getAll().forEach((s) => s.kill());
        if (lenis) lenis.destroy();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  const title = ['Calculá', 'el', 'costo', 'real', 'de', 'cada', 'viaje'];

  return (
    <div className="v2">
      <div className="v2-sky" aria-hidden="true" />
      <canvas ref={canvasRef} className="v2-canvas" aria-hidden="true" />
      {!enable3D && <div className="v2-fallback" aria-hidden="true" />}
      <div className="v2-grain" aria-hidden="true" />

      <div className="v2-content">
        <nav className="v2-nav">
          <Link href="/v2" className="v2-logo">
            <LogoMark /><span><b>Flet</b><i>IA</i></span>
          </Link>
          <div className="v2-nav-actions">
            <Link href="/login" className="v2-btn ghost">Iniciar sesión</Link>
            <Link href="/registro" className="v2-btn primary">Empezar gratis →</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="v2-hero">
          <span className="v2-eyebrow v2-onload"><span className="dot" />INTELIGENCIA ARTIFICIAL PARA TU FLOTA DE CAMIONES</span>
          <h1 className="v2-title">
            {title.map((w, i) => (
              <span className="w-wrap" key={i}><span className={`w${w === 'viajes' || w === 'real' ? ' accent' : ''}`}>{w}</span>{' '}</span>
            ))}
          </h1>
          <p className="v2-lead v2-onload">FletIA calcula cuánto te cuesta cada flete antes de salir. Con IA que aprende de tu camión y te dice si el viaje es rentable — en tiempo real y desde tu celular o portátil.</p>
          <div className="v2-cta v2-onload">
            <Link href="/registro" className="v2-btn primary lg">⚡ Empezar gratis — 15 días</Link>
            <Link href="/login" className="v2-btn ghost lg">Ya tengo cuenta</Link>
          </div>
          <div className="v2-cta-meta v2-onload">✓ Sin tarjeta &nbsp;·&nbsp; ✓ Cancelás cuando querés</div>
          <div className="v2-scroll-hint v2-onload"><span /></div>
        </section>

        {/* CAPACIDADES */}
        <section className="v2-section" id="capacidades">
          <div className="v2-head r">
            <div className="v2-tag">// Capacidades</div>
            <h2 className="v2-h2">Todo lo que necesitás para saber si el viaje da.</h2>
            <p className="v2-sub">Seis funciones pensadas para transportistas que no tienen tiempo para planillas.</p>
          </div>
          <div className="v2-feats r-stagger">
            {CAPACIDADES.map((c) => (
              <div className="glass v2-feat" key={c.n}>
                <div className="num">{c.n}</div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TODO LO QUE INCLUYE */}
        <section className="v2-section tight">
          <div className="v2-head r">
            <div className="v2-tag">// La plataforma completa</div>
            <h2 className="v2-h2">Una sola pantalla. Todo el viaje bajo control.</h2>
          </div>
          <div className="v2-mini r-stagger">
            {FEATURES.map((f) => (
              <div className="glass v2-mini-item" key={f.title}>
                <span className="ico">{f.icon}</span>
                <div>
                  <div className="t">{f.title}</div>
                  <div className="d">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="v2-section" id="how">
          <div className="v2-how">
            <div className="v2-how-copy r">
              <div className="v2-tag">// Cómo funciona</div>
              <h2 className="v2-h2">Tres datos. Una respuesta clara.</h2>
              <p className="v2-sub">No hay planillas, no hay hojas de cálculo, no hay magia. Cargás lo que vas a hacer, FletIA hace los números, y vos decidís.</p>
              <div className="v2-steps">
                <div className="step"><span className="n">1</span><div><div className="t">Cargás el viaje</div><div className="d">Origen, destino, peso y qué camión vas a usar. 15 segundos.</div></div></div>
                <div className="step"><span className="n">2</span><div><div className="t">La IA calcula</div><div className="d">Combina distancia, consumo aprendido y precio actual del gasoil.</div></div></div>
                <div className="step"><span className="n">3</span><div><div className="t">Decidís con datos</div><div className="d">Te muestra costo, margen y si el flete que te ofrecen conviene.</div></div></div>
              </div>
            </div>
            <div className="glass v2-console r">
              <div className="bar"><span className="d r-dot" /><span className="d y" /><span className="d g" /><span className="ttl">fletia • nuevo viaje</span></div>
              <div className="body">
                <div><span className="m">&gt;</span> <span className="k">camión</span> · <span className="h">Scania R-450</span></div>
                <div><span className="m">&gt;</span> <span className="k">ruta</span> · <span className="h">Rosario → Bahía Blanca</span></div>
                <div><span className="m">&gt;</span> <span className="k">peso</span> · <span className="h">28.500 kg</span></div>
                <div><span className="m">&gt;</span> <span className="k">terreno</span> · <span className="h">ruta · mixto</span></div>
                <div className="cmt">// calculando con 47 viajes previos…</div>
                <div className="calc">
                  <div className="row"><span>Distancia</span><span>782 km</span></div>
                  <div className="row"><span>Consumo estimado</span><span>253 L · <em>3,09 km/L</em></span></div>
                  <div className="row"><span>Gasoil ($/L)</span><span>$2.199</span></div>
                  <div className="row total"><span>Costo combustible</span><span>$556.347</span></div>
                  <span className="rentab">▲ rentable · margen 22%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RED INTELIGENTE */}
        <section className="v2-section" id="red">
          <div className="v2-head center r">
            <div className="v2-tag">// Red inteligente</div>
            <h2 className="v2-h2">Cada ruta, conectada</h2>
            <p className="v2-sub">FletIA aprende de cada viaje y escala con tu operación — de un camión a toda tu flota, en todo el país.</p>
          </div>
          <div className="v2-globe-wrap r">
            <canvas ref={globeRef} className="v2-globe" aria-hidden="true" />
            {!enable3D && <div className="v2-globe-fallback" aria-hidden="true" />}
            <div className="v2-globe-cards">
              <div className="glass gcard a"><div className="gk">// Aprendizaje</div><div className="gv">+47 viajes</div><div className="gd">afinan el consumo real de cada camión</div></div>
              <div className="glass gcard b"><div className="gk">// Escala</div><div className="gv">1 → 10+ camiones</div><div className="gd">la misma plataforma, sin fricción</div></div>
              <div className="glass gcard c"><div className="gk">// Cobertura</div><div className="gv">Todo el país</div><div className="gd">rutas del NOA y más allá</div></div>
            </div>
          </div>
        </section>

        {/* PLANES */}
        <section className="v2-section" id="planes">
          <div className="v2-head center r">
            <div className="v2-tag">// Planes</div>
            <h2 className="v2-h2">Elegí el plan que se adapta a tu flota</h2>
            <p className="v2-sub">Desde un camión hasta una flota completa. Empezá gratis y escalá cuando lo necesites.</p>
          </div>
          <div className="v2-plans r-stagger">
            <div className="glass v2-plan">
              <div className="pname">Prueba</div>
              <div className="pprice">Gratis</div>
              <div className="psub">15 días completos. Sin tarjeta de crédito.</div>
              <ul>
                <li className="ok">1 camión</li>
                <li className="ok">Viajes ilimitados</li>
                <li className="ok">IA que aprende</li>
                <li className="ok">Reporte de rentabilidad</li>
                <li className="no">Soporte prioritario</li>
              </ul>
              <Link href="/registro" className="v2-btn ghost lg">Empezar gratis</Link>
            </div>
            <div className="glass v2-plan featured">
              <span className="ribbon">Recomendado</span>
              <div className="pname">Básico</div>
              <div className="pprice">$20.000<span className="per">/ camión / mes</span></div>
              <div className="psub">De 1 a 3 camiones. Ideal para transportistas independientes.</div>
              <ul>
                <li className="ok">Hasta 3 camiones</li>
                <li className="ok">Viajes ilimitados</li>
                <li className="ok">IA que aprende por camión</li>
                <li className="ok">Reportes y rentabilidad</li>
                <li className="ok">Soporte por WhatsApp</li>
              </ul>
              <Link href="/registro" className="v2-btn primary lg">Empezar ahora</Link>
            </div>
            <div className="glass v2-plan">
              <div className="pname">Flota</div>
              <div className="pprice">$15.000<span className="per">/ camión / mes</span></div>
              <div className="psub">De 4 a 10 camiones. Precio por volumen para PyMEs.</div>
              <ul>
                <li className="ok">Hasta 10 camiones</li>
                <li className="ok">Todo lo del plan Básico</li>
                <li className="ok">Exportar por camión (Excel/PDF)</li>
                <li className="ok">Soporte prioritario</li>
              </ul>
              <Link href="/registro" className="v2-btn ghost lg">Empezar ahora</Link>
            </div>
          </div>
          <div className="v2-plans-foot r">+10 camiones? <a href="mailto:hola@flet-ia.com">Escribinos</a> y armamos un plan a medida.</div>
        </section>

        {/* FAQ */}
        <section className="v2-section" id="faq">
          <div className="v2-head center r">
            <div className="v2-tag">// Preguntas frecuentes</div>
            <h2 className="v2-h2">Lo que todos preguntan antes de empezar</h2>
          </div>
          <div className="v2-faq r-stagger">
            {FAQ.map((f) => (
              <details className="glass" key={f.q}>
                <summary>{f.q}<span className="ic">+</span></summary>
                <div className="a">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="v2-section">
          <div className="glass v2-final r">
            <h2>Tu próximo flete, con los números antes de salir.</h2>
            <p>Probalo 15 días gratis. Sin tarjeta, sin hardware, sin vueltas.</p>
            <Link href="/registro" className="v2-btn primary lg">⚡ Empezar gratis ahora</Link>
          </div>
        </section>

        <footer className="v2-foot">
          <span>© 2026 FletIA · Todos los derechos reservados.</span>
          <span>Argentina</span>
          <span className="sep">·</span>
          <Link href="/privacidad">Política de privacidad</Link>
        </footer>
      </div>

      <style jsx global>{`
        html.lenis, html.lenis body { height:auto; }
        .lenis.lenis-smooth { scroll-behavior:auto !important; }
        .lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior:contain; }
        .lenis.lenis-stopped { overflow:hidden; }
        .v2 { --accent:#eb4b15; --dark:#0d0b09; --cream:#f0ede8; --mono:var(--f-mono,monospace); --disp:var(--f-display,sans-serif); --body:var(--f-body,system-ui);
          position:relative; min-height:100vh; color:var(--cream);
          font-family:var(--body); background:#0a0807;
          background-image:radial-gradient(1200px 600px at 70% -5%, rgba(235,75,21,0.16), transparent 60%), radial-gradient(900px 500px at 10% 20%, rgba(58,110,165,0.10), transparent 55%);
          overflow-x:hidden;
        }
        .v2-sky { position:fixed; inset:0; z-index:0; pointer-events:none;
          background:
            radial-gradient(100% 72% at 72% 70%, rgba(235,75,21,0.22), transparent 62%),
            radial-gradient(80% 60% at 18% 18%, rgba(58,110,165,0.08), transparent 60%),
            linear-gradient(180deg, #0a0807 0%, #0d0a08 52%, #1c0f0a 100%); }
        .v2-canvas { position:fixed; inset:0; width:100vw; height:100vh; z-index:0; pointer-events:none; }
        .v2-fallback { position:fixed; inset:0; z-index:0; pointer-events:none;
          background:radial-gradient(60% 50% at 70% 40%, rgba(235,75,21,0.22), transparent 70%), repeating-linear-gradient(0deg, transparent, transparent 38px, rgba(235,75,21,0.05) 39px), repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(235,75,21,0.05) 39px);
        }
        .v2-grain { position:fixed; inset:0; z-index:1; pointer-events:none; opacity:0.5;
          background:radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.55) 100%); }
        .v2-content { position:relative; z-index:2; max-width:1180px; margin:0 auto; padding:0 24px; }

        .v2-nav { position:sticky; top:0; z-index:20; display:flex; justify-content:space-between; align-items:center;
          padding:14px 18px; margin:14px 0; border-radius:16px;
          background:rgba(16,13,11,0.55); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(240,237,232,0.08); }
        .v2-logo { display:inline-flex; align-items:center; gap:9px; text-decoration:none; color:var(--cream);
          font-family:var(--disp); font-weight:800; font-size:1.45rem; letter-spacing:0.5px; }
        .v2-logo i { color:var(--accent); font-style:normal; }
        .v2-nav-actions { display:flex; gap:10px; }

        .v2-btn { display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:0.86rem;
          padding:10px 18px; border-radius:11px; text-decoration:none; cursor:pointer; transition:transform .25s cubic-bezier(.2,.8,.2,1), background .25s, border-color .25s, box-shadow .25s; border:1px solid transparent; }
        .v2-btn.lg { padding:14px 26px; font-size:0.98rem; }
        .v2-btn.primary { background:var(--accent); color:#fff; box-shadow:0 6px 22px rgba(235,75,21,0.35); }
        .v2-btn.primary:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(235,75,21,0.5); }
        .v2-btn.ghost { background:rgba(240,237,232,0.05); color:var(--cream); border-color:rgba(240,237,232,0.15); }
        .v2-btn.ghost:hover { border-color:rgba(235,75,21,0.5); transform:translateY(-2px); }

        .v2-hero { min-height:92vh; display:flex; flex-direction:column; justify-content:center; padding:60px 0 40px; }
        .v2-eyebrow { display:inline-flex; align-items:center; gap:9px; align-self:flex-start; font-family:var(--mono); font-size:0.7rem; letter-spacing:0.16em; text-transform:uppercase; color:rgba(240,237,232,0.6); padding:7px 14px; border-radius:20px; background:rgba(240,237,232,0.04); border:1px solid rgba(240,237,232,0.1); }
        .v2-eyebrow .dot { width:7px; height:7px; border-radius:50%; background:var(--accent); box-shadow:0 0 10px var(--accent); animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .v2-title { font-family:var(--disp); font-weight:900; text-transform:uppercase; line-height:0.92;
          font-size:clamp(3rem, 9vw, 7.5rem); letter-spacing:-0.01em; margin:24px 0 0; max-width:14ch; }
        .v2-title .w-wrap { display:inline-flex; overflow:hidden; }
        .v2-title .w { display:inline-block; }
        .v2-title .w.accent { color:var(--accent); font-style:italic; }
        .v2-lead { max-width:560px; margin:28px 0 0; font-size:1.12rem; line-height:1.6; color:rgba(240,237,232,0.72); }
        .v2-cta { display:flex; flex-wrap:wrap; gap:14px; margin-top:32px; }
        .v2-cta-meta { font-family:var(--mono); font-size:0.74rem; color:rgba(240,237,232,0.4); margin-top:16px; }
        .v2-scroll-hint { margin-top:48px; width:26px; height:42px; border:2px solid rgba(240,237,232,0.2); border-radius:14px; position:relative; }
        .v2-scroll-hint span { position:absolute; top:7px; left:50%; width:4px; height:8px; margin-left:-2px; background:var(--accent); border-radius:2px; animation:scrolld 1.6s infinite; }
        @keyframes scrolld { 0%{opacity:0;transform:translateY(0)} 40%{opacity:1} 100%{opacity:0;transform:translateY(14px)} }

        .v2-section { padding:90px 0; }
        .v2-section.tight { padding-top:20px; }
        .v2-head { max-width:680px; margin-bottom:44px; }
        .v2-head.center { margin:0 auto 48px; text-align:center; }
        .v2-tag { font-family:var(--mono); font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--accent); margin-bottom:14px; }
        .v2-h2 { font-family:var(--disp); font-weight:800; text-transform:uppercase; line-height:1.02; font-size:clamp(1.9rem,4.5vw,3.2rem); letter-spacing:-0.01em; margin:0; }
        .v2-sub { margin:16px 0 0; font-size:1.02rem; line-height:1.55; color:rgba(240,237,232,0.6); }

        .glass { background:rgba(240,237,232,0.045); backdrop-filter:blur(13px); -webkit-backdrop-filter:blur(13px);
          border:1px solid rgba(240,237,232,0.1); border-radius:18px; transition:border-color .3s, transform .3s, background .3s; }

        .v2-feats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .v2-feat { padding:28px 24px; }
        .v2-feat:hover { border-color:rgba(235,75,21,0.4); transform:translateY(-4px); background:rgba(235,75,21,0.05); }
        .v2-feat .num { font-family:var(--mono); font-size:0.78rem; color:var(--accent); margin-bottom:14px; }
        .v2-feat h3 { font-family:var(--disp); font-weight:700; font-size:1.35rem; text-transform:uppercase; margin:0 0 10px; }
        .v2-feat p { margin:0; font-size:0.92rem; line-height:1.55; color:rgba(240,237,232,0.6); }

        .v2-mini { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; max-width:760px; }
        .v2-mini-item { display:flex; align-items:center; gap:12px; padding:13px 16px; border-radius:12px; }
        .v2-mini-item:hover { border-color:rgba(235,75,21,0.4); background:rgba(235,75,21,0.05); }
        .v2-mini-item .ico { font-size:1.3rem; flex-shrink:0; }
        .v2-mini-item .t { font-weight:700; font-size:0.9rem; }
        .v2-mini-item .d { font-size:0.76rem; color:rgba(240,237,232,0.42); margin-top:2px; }

        .v2-how { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; }
        .v2-steps { margin-top:28px; display:flex; flex-direction:column; gap:20px; }
        .v2-steps .step { display:flex; gap:16px; align-items:flex-start; }
        .v2-steps .n { flex-shrink:0; width:36px; height:36px; border-radius:50%; display:grid; place-items:center; font-family:var(--disp); font-weight:800; background:rgba(235,75,21,0.15); color:var(--accent); border:1px solid rgba(235,75,21,0.4); }
        .v2-steps .t { font-weight:700; font-size:1.02rem; }
        .v2-steps .d { font-size:0.9rem; color:rgba(240,237,232,0.55); margin-top:3px; }
        .v2-console { padding:0; overflow:hidden; font-family:var(--mono); }
        .v2-console .bar { display:flex; align-items:center; gap:7px; padding:13px 16px; border-bottom:1px solid rgba(240,237,232,0.08); background:rgba(0,0,0,0.25); }
        .v2-console .bar .d { width:11px; height:11px; border-radius:50%; background:rgba(240,237,232,0.25); }
        .v2-console .bar .d.r-dot { background:#ff5f57; } .v2-console .bar .d.y { background:#febc2e; } .v2-console .bar .d.g { background:#28c840; }
        .v2-console .bar .ttl { margin-left:8px; font-size:0.74rem; color:rgba(240,237,232,0.45); }
        .v2-console .body { padding:20px; font-size:0.84rem; line-height:1.9; }
        .v2-console .m { color:rgba(240,237,232,0.3); } .v2-console .k { color:rgba(240,237,232,0.5); } .v2-console .h { color:var(--cream); }
        .v2-console .cmt { color:rgba(235,75,21,0.7); margin-top:10px; }
        .v2-console .calc { margin-top:14px; padding:16px; border-radius:12px; background:rgba(0,0,0,0.3); border:1px solid rgba(240,237,232,0.07); }
        .v2-console .calc .row { display:flex; justify-content:space-between; padding:5px 0; font-size:0.82rem; color:rgba(240,237,232,0.7); }
        .v2-console .calc .row em { color:var(--accent); font-style:normal; }
        .v2-console .calc .row.total { border-top:1px solid rgba(240,237,232,0.12); margin-top:6px; padding-top:11px; font-weight:700; color:var(--cream); font-size:0.95rem; }
        .v2-console .rentab { display:inline-block; margin-top:12px; font-size:0.78rem; color:#28c840; }

        .v2-globe-wrap { position:relative; max-width:920px; margin:0 auto; height:min(64vh,580px); }
        .v2-globe, .v2-globe-fallback { position:absolute; inset:0; width:100%; height:100%; display:block; }
        .v2-globe-fallback { margin:auto; width:min(78%,440px); height:min(78%,440px); border-radius:50%;
          background:radial-gradient(circle at 50% 45%, rgba(235,75,21,0.2), rgba(235,75,21,0.05) 55%, transparent 72%); border:1px solid rgba(235,75,21,0.22); }
        .v2-globe-cards { position:absolute; inset:0; pointer-events:none; }
        .v2-globe-cards .gcard { position:absolute; padding:13px 16px; max-width:210px; pointer-events:auto; }
        .gcard .gk { font-family:var(--mono); font-size:0.66rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--accent); }
        .gcard .gv { font-family:var(--disp); font-weight:800; font-size:1.35rem; margin:4px 0 2px; line-height:1; }
        .gcard .gd { font-size:0.74rem; color:rgba(240,237,232,0.55); line-height:1.4; }
        .gcard.a { top:5%; left:0; } .gcard.b { bottom:7%; left:4%; } .gcard.c { top:24%; right:0; }

        .v2-plans { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; align-items:stretch; }
        .v2-plan { padding:32px 26px; display:flex; flex-direction:column; position:relative; }
        .v2-plan.featured { border-color:rgba(235,75,21,0.5); box-shadow:0 0 40px rgba(235,75,21,0.18); }
        .v2-plan .ribbon { position:absolute; top:-11px; left:50%; transform:translateX(-50%); background:var(--accent); color:#fff; font-size:0.68rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; padding:5px 14px; border-radius:20px; }
        .v2-plan .pname { font-family:var(--mono); font-size:0.78rem; letter-spacing:0.1em; text-transform:uppercase; color:rgba(240,237,232,0.5); }
        .v2-plan .pprice { font-family:var(--disp); font-weight:800; font-size:2.6rem; margin:8px 0 2px; }
        .v2-plan .pprice .per { font-family:var(--body); font-size:0.82rem; font-weight:500; color:rgba(240,237,232,0.45); margin-left:4px; }
        .v2-plan .psub { font-size:0.84rem; color:rgba(240,237,232,0.55); margin-bottom:20px; min-height:38px; }
        .v2-plan ul { list-style:none; padding:0; margin:0 0 24px; display:flex; flex-direction:column; gap:11px; flex:1; }
        .v2-plan li { font-size:0.88rem; padding-left:26px; position:relative; color:rgba(240,237,232,0.8); }
        .v2-plan li.ok::before { content:'✓'; position:absolute; left:0; color:var(--accent); font-weight:800; }
        .v2-plan li.no { color:rgba(240,237,232,0.35); }
        .v2-plan li.no::before { content:'✕'; position:absolute; left:0; }
        .v2-plans-foot { text-align:center; margin-top:24px; font-family:var(--mono); font-size:0.74rem; color:rgba(240,237,232,0.35); }
        .v2-plans-foot a { color:var(--accent); text-decoration:none; }

        .v2-faq { max-width:720px; margin:0 auto; display:flex; flex-direction:column; gap:10px; }
        .v2-faq details { overflow:hidden; }
        .v2-faq summary { cursor:pointer; padding:17px 22px; font-weight:700; font-size:0.96rem; display:flex; justify-content:space-between; align-items:center; gap:12px; list-style:none; }
        .v2-faq summary::-webkit-details-marker { display:none; }
        .v2-faq .ic { color:var(--accent); font-size:1.4rem; line-height:1; transition:transform .25s; }
        .v2-faq details[open] .ic { transform:rotate(45deg); }
        .v2-faq details[open] { border-color:rgba(235,75,21,0.3); }
        .v2-faq .a { padding:0 22px 18px; font-size:0.9rem; line-height:1.6; color:rgba(240,237,232,0.6); }

        .v2-final { text-align:center; padding:56px 32px; }
        .v2-final h2 { font-family:var(--disp); font-weight:800; text-transform:uppercase; font-size:clamp(1.8rem,4vw,3rem); margin:0 0 12px; line-height:1.05; }
        .v2-final p { color:rgba(240,237,232,0.6); margin:0 0 28px; }

        .v2-foot { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:center; padding:40px 0 56px; font-family:var(--mono); font-size:0.74rem; color:rgba(240,237,232,0.4); }
        .v2-foot a { color:rgba(240,237,232,0.5); text-decoration:none; }
        .v2-foot .sep { opacity:0.4; }

        @media (max-width:880px){
          .v2-feats { grid-template-columns:1fr 1fr; }
          .v2-how { grid-template-columns:1fr; gap:32px; }
          .v2-plans { grid-template-columns:1fr; max-width:420px; margin:0 auto; }
        }
        @media (max-width:760px){
          .v2-globe-wrap { height:auto; }
          .v2-globe, .v2-globe-fallback { position:relative; inset:auto; height:44vh; margin:0 auto; }
          .v2-globe-cards { position:static; display:grid; grid-template-columns:1fr; gap:10px; margin-top:18px; }
          .v2-globe-cards .gcard { position:static; inset:auto; max-width:none; }
        }
        @media (max-width:560px){
          .v2-feats, .v2-mini { grid-template-columns:1fr; }
          .v2-nav-actions .ghost { display:none; }
        }
      `}</style>
    </div>
  );
}
