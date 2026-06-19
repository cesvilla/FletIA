import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — FletIA',
  description: 'Cómo FletIA trata y protege tus datos personales y los de tus choferes, según la Ley 25.326 de Protección de Datos Personales de Argentina.',
};

const SECCIONES = [
  {
    t: '1. Responsable del tratamiento',
    c: 'FletIA, con domicilio en Argentina, es responsable del tratamiento de los datos personales recolectados a través de la plataforma. Contacto: hola@flet-ia.com o WhatsApp +54 9 381 642-1849.',
  },
  {
    t: '2. Qué datos recolectamos',
    c: 'De tu cuenta: correo electrónico y nombre de la empresa. Operativos: datos de tus camiones (patente, marca, modelo, consumo), de tus viajes (origen, destino, peso, costos) y tus recordatorios. Al compartir una ruta con un chofer: nombre y celular del chofer y —solo si el chofer lo activa voluntariamente— su ubicación GPS en tiempo real durante el viaje.',
  },
  {
    t: '3. Para qué los usamos',
    c: 'Únicamente para prestarte el servicio: calcular el costo real de cada flete, mostrar rentabilidad e historial, y permitir el seguimiento de las rutas que vos generás. No vendemos ni cedemos tus datos a terceros con fines publicitarios.',
  },
  {
    t: '4. Consentimiento y base legal',
    c: 'Tratamos tus datos sobre la base de tu consentimiento, otorgado al registrarte y utilizar la plataforma, en los términos de la Ley 25.326 de Protección de Datos Personales. La ubicación del chofer se registra exclusivamente si el chofer la activa por su cuenta desde el link de la ruta.',
  },
  {
    t: '5. Dónde se alojan tus datos',
    c: 'La información se almacena en Supabase (servicio de base de datos) y se entrega a través de Vercel (alojamiento web), que actúan como encargados del tratamiento bajo medidas de seguridad estándar de la industria.',
  },
  {
    t: '6. Conservación',
    c: 'Los links de ruta compartida y la ubicación del chofer expiran automáticamente a las 24 horas o cuando cerrás la ruta. El resto de los datos se conservan mientras tu cuenta esté activa; al darte de baja, se eliminan o anonimizan.',
  },
  {
    t: '7. Seguridad',
    c: 'Aplicamos aislamiento por cuenta (Row Level Security): cada usuario accede únicamente a su propia información. Todas las conexiones viajan cifradas por HTTPS.',
  },
  {
    t: '8. Tus derechos',
    c: 'Podés acceder, rectificar, actualizar o solicitar la supresión de tus datos personales en cualquier momento escribiendo a hola@flet-ia.com. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA (AAIP), órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos relativos al incumplimiento de las normas sobre protección de datos personales.',
  },
  {
    t: '9. Cambios en esta política',
    c: 'Podemos actualizar esta política. Publicaremos la versión vigente en esta misma página, con su fecha de actualización.',
  },
];

export default function PrivacidadPage() {
  return (
    <div className="shell" style={{ minHeight: '100vh', paddingTop: 0 }}>
      <nav className="top">
        <Link href="/" className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
          <svg width="36" height="26" viewBox="0 0 84 60" aria-hidden="true" style={{ color: '#eb4b15', flexShrink: 0 }}>
            <path fill="currentColor" d="M8,18 H48 V44 H8 Z M50,26 H64 L72,35 V44 H50 Z" />
            <path fill="currentColor" fillRule="evenodd" d="M20,39 a7,7 0 1,0 0,14 a7,7 0 1,0 0,-14 Z M20,43 a3,3 0 1,1 0,6 a3,3 0 1,1 0,-6 Z" />
            <path fill="currentColor" fillRule="evenodd" d="M60,39 a7,7 0 1,0 0,14 a7,7 0 1,0 0,-14 Z M60,43 a3,3 0 1,1 0,6 a3,3 0 1,1 0,-6 Z" />
            <circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="20" cy="8" r="2.6" fill="currentColor" /><circle cx="28" cy="4" r="3.2" fill="currentColor" />
          </svg>
          <span><b>Flet</b><span className="ia">IA</span></span>
        </Link>
        <Link href="/" className="btn ghost">← Volver</Link>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 0 80px' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, textTransform: 'uppercase', color: '#f0ede8', lineHeight: 1.05, margin: '0 0 12px' }}>
          Política de Privacidad
        </h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.78rem', color: '#eb4b15', marginBottom: '40px' }}>
          Vigente desde el 11 de junio de 2026
        </p>

        {SECCIONES.map((s) => (
          <section key={s.t} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, color: '#f0ede8', margin: '0 0 10px' }}>
              {s.t}
            </h2>
            <p style={{ fontSize: '0.98rem', lineHeight: 1.7, color: 'rgba(240,237,232,0.7)', margin: 0 }}>
              {s.c}
            </p>
          </section>
        ))}
      </main>

      <footer>
        <div className="foot">
          <div className="made">
            <span>© 2026 FletIA · Todos los derechos reservados.</span>
            <span>Argentina</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
