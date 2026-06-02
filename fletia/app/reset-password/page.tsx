'use client';

/**
 * Página de restablecimiento de contraseña.
 * El cliente llega acá desde el enlace que recibe por email (resetPasswordForEmail).
 * El cliente de Supabase del navegador detecta automáticamente la sesión de
 * recuperación que viene en la URL; acá solo pedimos la contraseña nueva.
 *
 * Importante: cambiar la contraseña NO afecta los datos del usuario. La cuenta se
 * identifica por su UUID interno, así que camiones, viajes e historial quedan intactos.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [sesionLista, setSesionLista] = useState(false);

  useEffect(() => {
    // Al montar, el cliente del navegador parsea la URL y emite el evento de
    // recuperación. Habilitamos el formulario cuando hay sesión válida.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setSesionLista(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSesionLista(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        /session|missing|expired|invalid/i.test(error.message)
          ? 'El enlace no es válido o ya expiró. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".'
          : error.message || 'No se pudo cambiar la contraseña. Intentá de nuevo.'
      );
      return;
    }

    setOk(true);
    setTimeout(() => { router.push('/dashboard'); router.refresh(); }, 1800);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-display text-5xl font-black tracking-tight text-ink">
            Flet<span className="text-accent">IA</span>
          </div>
          <div className="font-mono text-[10px] tracking-[3px] text-ink-3 mt-1 uppercase">
            // inteligencia para cada viaje
          </div>
        </div>

        <div className="bg-card border border-ink/10 p-8">
          <h1 className="text-2xl font-bold mb-1">Nueva contraseña</h1>
          <p className="text-sm text-ink-3 mb-6">
            Elegí una contraseña nueva. Tus camiones, viajes e historial quedan tal cual estaban.
          </p>

          {ok ? (
            <div className="bg-success/10 border border-success/30 text-success text-sm font-mono px-3 py-4 text-center">
              ✓ Contraseña actualizada. Te llevamos a tu panel…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase block mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-ink text-sm font-medium outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase block mb-1.5">
                  Repetir contraseña
                </label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-ink text-sm font-medium outline-none focus:border-accent transition-colors"
                />
              </div>

              {!sesionLista && (
                <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs font-mono px-3 py-2.5">
                  ⏳ Abrí esta página desde el enlace que te llegó por email. Si llegaste de otra forma, el cambio puede fallar.
                </div>
              )}

              {error && (
                <div className="bg-accent/10 border border-accent/30 text-accent text-xs font-mono px-3 py-2.5">
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white py-3 font-bold text-sm tracking-wide hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA →'}
              </button>

              <a href="/login" className="block w-full text-center font-mono text-[10px] text-ink-3 hover:text-ink-2 hover:underline">
                ← Volver a iniciar sesión
              </a>
            </form>
          )}
        </div>

      </div>
    </main>
  );
}
