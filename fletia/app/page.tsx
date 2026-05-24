import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ backgroundColor: '#0a0e14', minHeight: '100vh', color: '#d6e0ec', fontFamily: 'Inter, sans-serif' }}>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '24px', fontWeight: 900, color: 'white' }}>
          Flet<span style={{ color: '#d4440c' }}>IA</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" style={{ padding: '8px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
          <Link href="/registro" style={{ padding: '8px 20px', fontSize: '13px', backgroundColor: '#d4440c', color: 'white', textDecoration: 'none', fontWeight: 700 }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 32px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '5px 14px', backgroundColor: 'rgba(212,68,12,0.12)', border: '1px solid rgba(212,68,12,0.3)', fontSize: '11px', letterSpacing: '3px', color: '#d4440c', textTransform: 'uppercase', marginBottom: '28px' }}>
          ● Inteligencia artificial para flotas argentinas
        </div>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-2px', marginBottom: '24px', color: 'white' }}>
          Calculá el costo real<br />de cada <span style={{ color: '#d4440c' }}>viaje</span>
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 40px' }}>
          FletIA calcula cuánto te cuesta cada flete antes de salir. Con IA que aprende de tu camión y te dice si el viaje es rentable.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/registro" style={{ padding: '16px 36px', backgroundColor: '#d4440c', color: 'white', fontWeight: 900, fontSize: '15px', textDecoration: 'none' }}>
            ⚡ Empezar gratis — 30 días
          </Link>
          <Link href="/login" style={{ padding: '16px 36px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: '15px', textDecoration: 'none' }}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { icon: '🧮', title: 'Cálculo antes del viaje', desc: 'Ingresás origen, destino, peso y te decimos el costo exacto en combustible antes de salir.' },
            { icon: '🧠', title: 'IA que aprende', desc: 'Cada viaje que registrás enseña a la IA. Con el tiempo, las estimaciones son más precisas para tu camión.' },
            { icon: '💰', title: 'Rentabilidad real', desc: 'Comparamos el flete que cobrás contra el costo real. Sabés al instante si ganás o perdés plata.' },
            { icon: '🚛', title: 'Por camión y por ruta', desc: 'Cada camión tiene su perfil. La IA aprende el consumo real de cada uno por separado.' },
            { icon: '🇦🇷', title: 'Hecho para Argentina', desc: 'Precio en pesos, soporte en español, pensado para PyMEs transportistas argentinas.' },
            { icon: '📱', title: 'Sin hardware', desc: 'No necesitás GPS ni dispositivos. Funciona desde el celular o la PC, sin instalaciones.' },
          ].map((b, i) => (
            <div key={i} style={{ backgroundColor: '#111722', padding: '32px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{b.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>{b.title}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 32px', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#111722', border: '1px solid rgba(255,255,255,0.08)', padding: '48px 40px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#d4440c', textTransform: 'uppercase', marginBottom: '16px' }}>Precio simple</div>
          <div style={{ fontSize: '64px', fontWeight: 900, color: 'white', lineHeight: 1 }}>Gratis</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px', marginTop: '8px' }}>30 días completos · Sin tarjeta de crédito</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '32px' }}>
            {['Camiones ilimitados', 'Viajes ilimitados', 'IA que aprende por camión', 'Reporte de rentabilidad', 'Soporte en español'].map((f, i) => (
              <div key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#1a6b3a' }}>✓</span> {f}
              </div>
            ))}
          </div>
          <Link href="/registro" style={{ display: 'block', padding: '16px', backgroundColor: '#d4440c', color: 'white', fontWeight: 900, fontSize: '15px', textDecoration: 'none', textAlign: 'center' }}>
            ⚡ Empezar gratis ahora
          </Link>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '40px 32px', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
        FletIA © 2025 · Hecho en Argentina 🇦🇷
      </footer>

    </main>
  );
}