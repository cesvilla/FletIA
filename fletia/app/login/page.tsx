'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Pantalla de login y registro.
 * Permite al usuario crear cuenta o ingresar con email + contraseña.
 */
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setLoading(true);

    try {
      if (modo === 'registro') {
        // Registrar nuevo usuario
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { empresa },
          },
        });

        if (error) throw error;

        if (data.user && data.user.identities?.length === 0) {
          setError('Este email ya está registrado. Probá iniciar sesión.');
        } else if (data.session) {
          // Si la confirmación de email está desactivada, ingresa directo
          router.push('/dashboard');
          router.refresh();
        } else {
          setMensaje('Cuenta creada. Revisá tu email para confirmar la cuenta.');
        }
      } else {
        // Iniciar sesión
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Algo salió mal. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
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
            // combustible inteligente
          </div>
        </div>

        {/* Card de login */}
        <div className="bg-card border border-ink/10 p-8">

          {/* Tabs login / registro */}
          <div className="flex mb-6 border-b border-ink/10">
            <button
              type="button"
              onClick={() => { setModo('login'); setError(null); setMensaje(null); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                modo === 'login'
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              INICIAR SESIÓN
            </button>
            <button
              type="button"
              onClick={() => { setModo('registro'); setError(null); setMensaje(null); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                modo === 'registro'
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              CREAR CUENTA
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold mb-1">
            {modo === 'login' ? 'Bienvenido de vuelta' : 'Crear tu cuenta'}
          </h1>
          <p className="text-sm text-ink-3 mb-6">
            {modo === 'login'
              ? 'Ingresá para ver tu flota y calcular viajes.'
              : 'Empezá gratis. Sin tarjeta de crédito.'}
          </p>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Empresa (solo en registro) */}
            {modo === 'registro' && (
              <div>
                <label className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase block mb-1.5">
                  Nombre de tu empresa
                </label>
                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="ej: Transportes García"
                  required
                  className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-ink text-sm font-medium outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-ink text-sm font-medium outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="font-mono text-[9px] tracking-[2px] text-ink-3 uppercase block mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
                required
                minLength={6}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                className="w-full px-3 py-2.5 bg-bg border border-ink/20 text-ink text-sm font-medium outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-accent/10 border border-accent/30 text-accent text-xs font-mono px-3 py-2.5">
                ⚠ {error}
              </div>
            )}

            {/* Mensaje de éxito */}
            {mensaje && (
              <div className="bg-success/10 border border-success/30 text-success text-xs font-mono px-3 py-2.5">
                ✓ {mensaje}
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white py-3 font-bold text-sm tracking-wide hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'PROCESANDO...'
                : modo === 'login'
                  ? 'INGRESAR →'
                  : 'CREAR CUENTA →'
              }
            </button>

          </form>

        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="font-mono text-[10px] text-ink-3 tracking-[1px]">
            // FletIA v0.1 — Sprint 1
          </p>
        </div>

      </div>
    </main>
  );
}
