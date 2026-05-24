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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root{--bg:#0a0a0a;--bg-2:#111111;--ink:#ffffff;--ink-2:#a0a0a0;--ink-3:#6b6b6b;--line:rgba(255,255,255,0.08);--line-strong:rgba(255,255,255,0.18);--cyan:#ff7a4d;--cyan-2:#ff6638;--cyan-deep:#d44a22;--amber:#ff7a4d;--amber-2:#ff6638;--argentina:#6ec6ff;--good:#34d399;--card:rgba(20,20,20,0.65);--card-bd:rgba(255,255,255,0.10)}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
        body{min-height:100vh;position:relative}
        .atmos{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
        .horizon-glow{position:absolute;left:-10%;right:-10%;top:60%;height:200px;background:radial-gradient(60% 100% at 30% 100%, rgba(255,122,77,0.14), transparent 60%),radial-gradient(40% 100% at 70% 100%, rgba(255,122,77,0.1), transparent 60%);filter:blur(20px);pointer-events:none}
        .truck-bg{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden}
        .truck-bg img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center center;pointer-events:none;filter:blur(1px) saturate(1.0) brightness(0.95) contrast(1.05);animation:driveby 28s ease-in-out infinite;will-change:transform,filter}
        .truck-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(10,10,10,0.25) 0%, rgba(10,10,10,0.12) 35%, rgba(10,10,10,0.30) 70%, rgba(10,10,10,0.92) 100%),linear-gradient(90deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.05) 35%, rgba(10,10,10,0.0) 65%, rgba(10,10,10,0.0) 100%),radial-gradient(50% 40% at 30% 50%, rgba(10,10,10,0.55), transparent 80%);pointer-events:none}
        .truck-bg::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 3px);mix-blend-mode:overlay;pointer-events:none}
        @keyframes driveby{0%,100%{transform:scale(1.04) translateX(0)}50%{transform:scale(1.08) translateX(-2%)}}
        .shell{position:relative;z-index:5;max-width:1240px;margin:0 auto;padding:0 32px}
        nav.top{display:flex;align-items:center;justify-content:space-between;padding:26px 0 0;position:relative;z-index:50}
        .logo{display:flex;align-items:center;gap:10px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:28px;letter-spacing:-0.025em;text-decoration:none;color:var(--ink)}
        .logo b{color:var(--ink);font-weight:700}
        .logo span.ia{color:var(--cyan);font-weight:700}
        nav.top .actions{display:flex;gap:10px;align-items:center}
        .hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:8px;z-index:60}
        .hamburger span{display:block;width:24px;height:2px;background:var(--ink);border-radius:2px;transition:transform .3s ease, opacity .3s ease}
        .hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
        .hamburger.open span:nth-child(2){opacity:0}
        .hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
        .mobile-menu{display:none;position:fixed;inset:0;z-index:40;background:rgba(10,10,10,0.97);backdrop-filter:blur(20px);flex-direction:column;align-items:center;justify-content:center;gap:24px}
        .mobile-menu.open{display:flex}
        .mobile-menu a{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:600;color:var(--ink);text-decoration:none;letter-spacing:-0.02em}
        .mobile-menu a.accent{color:var(--cyan)}
        .mobile-menu .divider{width:40px;height:1px;background:var(--line-strong);margin:8px 0}
        .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;letter-spacing:0;text-decoration:none;border:1px solid transparent;transition:transform .15s ease,box-shadow .2s ease,background .2s ease;cursor:pointer}
        .btn.ghost{color:var(--ink);border-color:var(--line-strong);background:rgba(255,255,255,0.02)}
        .btn.ghost:hover{background:var(--cyan);border-color:var(--cyan);color:#fff;transform:translateY(-1px) scale(1.06);box-shadow:0 12px 32px -10px rgba(255,122,77,0.7),0 0 0 1px var(--cyan)}
        .btn.primary{color:#fff;background:var(--cyan);box-shadow:0 0 0 1px rgba(255,122,77,0.4),0 12px 36px -10px rgba(255,122,77,0.6)}
        .btn.primary:hover{transform:translateY(-1px);background:var(--cyan-2);box-shadow:0 0 0 1px rgba(255,122,77,0.6),0 18px 44px -8px rgba(255,122,77,0.8)}
        .btn.amber{color:#fff;background:var(--cyan);box-shadow:0 0 0 1px rgba(255,122,77,0.4),0 12px 36px -10px rgba(255,122,77,0.6)}
        .btn.amber:hover{transform:translateY(-1px);background:var(--cyan-2)}
        .btn.lg{padding:15px 24px;font-size:15px}
        .hero{padding:80px 0 36px;position:relative;min-height:88vh;display:flex;flex-direction:column;justify-content:center}
        .hero .eyebrow,.hero h1,.hero .lead,.hero .cta-row,.hero .stats{position:relative;z-index:2}
        .hero::before{content:"";position:absolute;left:-32px;right:-32px;top:0;bottom:0;background:radial-gradient(ellipse 80% 60% at 20% 40%, rgba(10,10,10,0.78) 0%, rgba(10,10,10,0.35) 50%, transparent 80%);pointer-events:none;z-index:1}
        .eyebrow{display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:6px;border:1px solid var(--cyan);background:rgba(10,10,10,0.5);backdrop-filter:blur(8px);font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--cyan);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:28px;align-self:flex-start;font-weight:500}
        .eyebrow .dot{width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 10px var(--cyan);animation:pulse 1.6s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(0.8)}}
        h1.hero-title{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(48px,7.2vw,104px);line-height:0.96;letter-spacing:-0.035em;margin:0 0 28px;max-width:1100px;color:var(--ink)}
        h1.hero-title em{font-style:normal;color:var(--cyan)}
        .lead{font-size:19px;line-height:1.55;color:var(--ink);max-width:640px;margin:0 0 40px;opacity:0.92}
        .cta-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
        .cta-meta{display:flex;align-items:center;gap:10px;color:var(--ink);font-size:13px;font-family:'JetBrains Mono',monospace;margin-left:6px;opacity:0.9}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:36px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:22px 0}
        .stat{padding:0 20px;border-right:1px solid var(--line)}
        .stat:last-child{border-right:none}
        .stat .k{font-family:'Space Grotesk',sans-serif;font-size:32px;font-weight:600;letter-spacing:-0.03em;color:var(--ink)}
        .stat .k .u{color:var(--cyan);font-size:18px;margin-left:2px}
        .stat .l{font-size:12px;color:var(--ink);opacity:0.85;text-transform:uppercase;letter-spacing:0.14em;font-family:'JetBrains Mono',monospace;margin-top:4px}
        .section{padding:56px 0;position:relative}
        .section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:32px;flex-wrap:wrap}
        .section-tag{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--cyan);text-transform:uppercase;letter-spacing:0.18em;margin-bottom:14px}
        .section-title{font-family:'Space Grotesk',sans-serif;font-size:clamp(36px,4.4vw,56px);font-weight:600;line-height:1.02;letter-spacing:-0.03em;margin:0;max-width:720px}
        .section-sub{color:var(--ink-2);font-size:16px;max-width:380px;line-height:1.55;margin:0}
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .feat{position:relative;padding:30px 26px 32px;border-radius:18px;background:linear-gradient(180deg,rgba(20,20,20,0.55),rgba(20,20,20,0.30));border:1px solid rgba(255,255,255,0.10);overflow:hidden;backdrop-filter:blur(14px) saturate(1.1);box-shadow:0 4px 24px -8px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06);animation:floatcard 6s ease-in-out infinite;transition:transform .35s,border-color .25s,box-shadow .35s,background .35s}
        .feat:nth-child(2){animation-delay:-1s}.feat:nth-child(3){animation-delay:-2s}.feat:nth-child(4){animation-delay:-3s}.feat:nth-child(5){animation-delay:-4s}.feat:nth-child(6){animation-delay:-5s}
        @keyframes floatcard{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .feat:hover{animation-play-state:paused;transform:translateY(-8px) scale(1.015);border-color:var(--cyan);box-shadow:0 0 0 1px var(--cyan),0 24px 60px -18px rgba(255,122,77,0.55),inset 0 1px 0 rgba(255,255,255,0.10)}
        .feat::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 0% 0%,rgba(255,122,77,0.08),transparent 50%);pointer-events:none}
        .feat .ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:rgba(255,122,77,0.08);border:1px solid rgba(255,122,77,0.25);margin-bottom:20px;color:var(--cyan)}
        .feat .ico svg{width:22px;height:22px}
        .feat.amber .ico{background:rgba(255,122,77,0.08);border-color:rgba(255,122,77,0.3);color:var(--amber)}
        .feat h3{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:600;letter-spacing:-0.02em;margin:0 0 10px}
        .feat p{color:var(--ink-2);font-size:14.5px;line-height:1.55;margin:0}
        .feat .num{position:absolute;top:22px;right:22px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-3);letter-spacing:0.1em}
        .how{display:grid;grid-template-columns:1.05fr 0.95fr;gap:64px;align-items:center}
        .how-copy h2{font-family:'Space Grotesk',sans-serif;font-size:clamp(34px,4vw,50px);font-weight:600;line-height:1.02;letter-spacing:-0.03em;margin:0 0 20px}
        .how-copy p{color:var(--ink);font-size:16px;line-height:1.6;margin:0 0 28px;max-width:480px;opacity:0.92}
        .how-steps{display:flex;flex-direction:column;gap:14px}
        .how-step{display:flex;gap:16px;align-items:flex-start}
        .how-step .n{flex:0 0 28px;height:28px;border-radius:50%;display:grid;place-items:center;background:rgba(255,122,77,0.1);border:1px solid rgba(255,122,77,0.3);color:var(--cyan);font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600}
        .how-step .t{font-size:15px;color:var(--ink);font-weight:600;margin-bottom:2px}
        .how-step .d{color:var(--ink);font-size:13.5px;line-height:1.5;opacity:0.85}
        .console{background:linear-gradient(180deg,#141414,#0a0a0a);border:1px solid var(--card-bd);border-radius:18px;overflow:hidden;font-family:'JetBrains Mono',monospace;font-size:13px;box-shadow:0 30px 80px -30px rgba(255,122,77,0.25),0 0 0 1px rgba(255,122,77,0.1)}
        .console .bar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--line);background:rgba(255,255,255,0.02)}
        .console .bar .dot{width:10px;height:10px;border-radius:50%;background:#2a3a55}
        .console .bar .dot.g{background:#7af0b0}
        .console .bar .ttl{margin-left:10px;color:var(--ink-3);font-size:11px;letter-spacing:0.1em;text-transform:uppercase}
        .console .body{padding:22px 22px 24px;line-height:1.7;color:var(--ink-2)}
        .console .body .k{color:var(--cyan)}.console .body .a{color:var(--amber)}.console .body .g{color:var(--good)}.console .body .m{color:var(--ink-3)}.console .body .h{color:var(--ink);font-weight:500}
        .calc-card{margin-top:14px;padding:18px 18px 16px;border:1px dashed rgba(255,122,77,0.25);border-radius:12px;background:rgba(255,122,77,0.04)}
        .calc-card .row{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
        .calc-card .row .lbl{color:var(--ink-3);font-size:12px}.calc-card .row .val{color:var(--ink);font-size:13px}
        .calc-card .row.total{margin-top:10px;padding-top:12px;border-top:1px solid var(--line);font-size:14px}
        .calc-card .row.total .val{color:var(--good);font-weight:600;font-size:18px;font-family:'Space Grotesk',sans-serif;letter-spacing:-0.02em}
        .calc-card .rentab{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:4px 10px;background:rgba(122,240,176,0.1);border:1px solid rgba(122,240,176,0.3);border-radius:999px;color:var(--good);font-size:11px;font-weight:600}
        .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:1180px;margin:0 auto}
        .plan{position:relative;padding:34px 28px 32px;border-radius:22px;background:linear-gradient(180deg,rgba(20,20,20,0.7),rgba(20,20,20,0.45));border:1px solid rgba(255,255,255,0.10);backdrop-filter:blur(14px) saturate(1.1);overflow:hidden;transition:transform .35s,border-color .25s,box-shadow .35s;display:flex;flex-direction:column}
        .plan:hover{transform:translateY(-6px);border-color:rgba(255,122,77,0.5);box-shadow:0 24px 60px -20px rgba(255,122,77,0.35),inset 0 1px 0 rgba(255,255,255,0.08)}
        .plan.featured{background:linear-gradient(180deg,rgba(45,25,18,0.85),rgba(20,15,12,0.55));border-color:var(--cyan);box-shadow:0 0 0 1px var(--cyan),0 30px 80px -30px rgba(255,122,77,0.55)}
        .plan.featured::before{content:"";position:absolute;inset:0;background:radial-gradient(80% 100% at 50% 0%,rgba(255,122,77,0.15),transparent 60%);pointer-events:none}
        .plan .ribbon{position:absolute;top:14px;right:14px;padding:5px 10px;border-radius:999px;background:var(--cyan);color:#fff;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600}
        .plan .pname{font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;color:var(--cyan);text-transform:uppercase;letter-spacing:0.18em;margin-bottom:14px}
        .plan .pprice{font-family:'Space Grotesk',sans-serif;font-size:54px;font-weight:700;letter-spacing:-0.035em;line-height:1;color:var(--ink);display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
        .plan .pprice.compact{font-size:34px;letter-spacing:-0.02em;justify-content:center;text-align:center;width:100%}
        .plan .pprice .per{font-size:14px;color:var(--ink);opacity:0.6;font-weight:500;font-family:'Inter',sans-serif;letter-spacing:0;margin-left:4px}
        .plan .psub{color:var(--ink);opacity:0.75;font-size:14px;margin:10px 0 26px;min-height:38px}
        .plan ul.feats{list-style:none;padding:0;margin:0 0 28px;display:grid;gap:10px;flex:1}
        .plan ul.feats li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--ink);line-height:1.5}
        .plan ul.feats li svg{flex:0 0 16px;margin-top:3px;color:var(--cyan)}
        .plan ul.feats li.muted{color:var(--ink);opacity:0.45}
        .plan ul.feats li.muted svg{color:var(--ink-3)}
        .plan .btn{width:100%;justify-content:center}
        .price-wrap{display:grid;grid-template-columns:1fr;justify-items:center}
        .price{position:relative;width:100%;max-width:520px;padding:44px 40px 40px;border-radius:24px;background:linear-gradient(180deg,rgba(14,22,40,0.85),rgba(10,16,30,0.6));border:1px solid var(--card-bd);overflow:hidden}
        .price::before{content:"";position:absolute;inset:-1px;border-radius:24px;padding:1px;background:linear-gradient(160deg,rgba(255,122,77,0.55),transparent 40%,rgba(255,122,77,0.4) 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
        .price .label{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:0.18em;margin-bottom:14px}
        .price .amt{font-family:'Space Grotesk',sans-serif;font-size:84px;font-weight:700;letter-spacing:-0.04em;line-height:1;color:var(--cyan)}
        .price .sub{color:var(--ink-2);font-size:14.5px;margin:10px 0 28px}
        .price ul{list-style:none;padding:0;margin:0 0 32px;display:grid;gap:11px}
        .price ul li{display:flex;align-items:center;gap:10px;font-size:14.5px;color:var(--ink)}
        .price ul li svg{flex:0 0 16px;color:var(--cyan)}
        .price .btn{width:100%;justify-content:center}
        footer{position:relative;z-index:5;padding:60px 0 36px;border-top:1px solid var(--line);margin-top:40px}
        .foot{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;color:var(--ink-3);font-size:13px}
        .foot .made{display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em}
        .flag{width:24px;height:16px;border-radius:2px;background:linear-gradient(180deg,#6ec6ff 33%,#fff 33% 66%,#6ec6ff 66%);box-shadow:0 0 0 1px rgba(255,255,255,0.08)}
        @media(max-width:920px){.feat-grid{grid-template-columns:1fr 1fr}.how{grid-template-columns:1fr;gap:36px}.stats{grid-template-columns:1fr 1fr;gap:0}.stat{padding:14px 16px;border-bottom:1px solid var(--line)}.stat:nth-child(odd){border-right:1px solid var(--line)}.stat:nth-child(2){border-right:none}.plans{grid-template-columns:1fr;gap:14px}}
        @media(max-width:640px){.shell{padding:0 20px}.feat-grid{grid-template-columns:1fr}nav.top .actions{display:none}.hamburger{display:flex}.hero{padding:64px 0 56px;min-height:80vh}.lead{font-size:16px}.cta-row{flex-direction:column;align-items:flex-start}.cta-meta{margin-left:0;font-size:12px}}
        @media(prefers-reduced-motion:reduce){.truck-bg img,.eyebrow .dot{animation:none !important}.reveal,.reveal-stagger > *{opacity:1 !important;transform:none !important}}
        .reveal{opacity:0;transform:translateY(36px) scale(0.985);transition:opacity .8s cubic-bezier(.22,.61,.36,1),transform .8s cubic-bezier(.22,.61,.36,1)}
        .reveal.in{opacity:1;transform:translateY(0) scale(1)}
        .reveal-stagger > *{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),transform .7s cubic-bezier(.22,.61,.36,1)}
        .reveal-stagger.in > *{opacity:1;transform:translateY(0)}
        .reveal-stagger.in > *:nth-child(1){transition-delay:.00s}.reveal-stagger.in > *:nth-child(2){transition-delay:.08s}.reveal-stagger.in > *:nth-child(3){transition-delay:.16s}.reveal-stagger.in > *:nth-child(4){transition-delay:.24s}.reveal-stagger.in > *:nth-child(5){transition-delay:.32s}.reveal-stagger.in > *:nth-child(6){transition-delay:.40s}
      `}</style>

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
          <div className="stats reveal-stagger">
            <div className="stat"><div className="k">100%</div><div className="l">Web · sin app</div></div>
            <div className="stat"><div className="k">0<span className="u">hw</span></div><div className="l">Sin GPS ni dispositivos</div></div>
            <div className="stat"><div className="k">∞</div><div className="l">Camiones y viajes</div></div>
            <div className="stat"><div className="k">15d</div><div className="l">Prueba completa gratis</div></div>
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

        <section className="section" id="pricing" style={{paddingTop:'32px'}}>
          <div className="section-head reveal" style={{justifyContent:'center',textAlign:'center',flexDirection:'column',alignItems:'center',marginBottom:'36px'}}>
            <div><div className="section-tag" style={{color:'rgb(253,100,48)'}}>// Precio simple</div></div>
          </div>
          <div className="price-wrap reveal">
            <div className="price">
              <div className="label">Plan único</div>
              <div className="amt">Gratis</div>
              <div className="sub">15 días completos</div>
              <ul>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Camiones ilimitados</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Viajes ilimitados</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> IA que aprende por camión</li>
                <li><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> Reporte de rentabilidad</li>
                <li>Soporte</li>
              </ul>
              <Link href="/registro" className="btn amber lg">⚡ Empezar ahora</Link>
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
