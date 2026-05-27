'use client';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function VencidoPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f0ede8' }}>
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-6">🔒</div>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2.5rem', fontWeight: 900, color: '#1a1714', marginBottom: 8 }}>
          Demo vencida
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '3px', color: '#d4440c', textTransform: 'uppercase', marginBottom: 24 }}>
          // período de prueba finalizado
        </div>
        <div className="bg-white border border-gray-200 p-6 mb-6 text-left">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#4a4540', lineHeight: 1.7 }}>
            Tu período de prueba ha finalizado. Para continuar usando FletIA contactanos para activar tu cuenta.
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#8a8278', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          → Cerrar sesión
        </button>
      </div>
    </main>
  );
}
