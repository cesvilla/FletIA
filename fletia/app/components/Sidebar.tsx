'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Menú lateral único para todas las páginas. Garantiza que se vean SIEMPRE
// todas las secciones (Dashboard, Calculadora, Historial, Camiones, Rentabilidad)
// y Administración solo para el email admin.

interface NavItem { href: string; key: string; label: string; icon: string; group: string; }

const NAV: NavItem[] = [
  { href: '/dashboard',    key: 'dashboard',    label: 'Dashboard',    icon: '⚡', group: 'Principal' },
  { href: '/viajes',       key: 'viajes',       label: 'Calculadora',  icon: '🧮', group: 'Principal' },
  { href: '/historial',    key: 'historial',    label: 'Historial',    icon: '📋', group: 'Principal' },
  { href: '/camiones',     key: 'camiones',     label: 'Mis camiones', icon: '🚛', group: 'Flota' },
  { href: '/rentabilidad', key: 'rentabilidad', label: 'Rentabilidad', icon: '💰', group: 'Análisis' },
];

export default function Sidebar({
  active, empresa, email, open, onClose,
}: {
  active: string;
  empresa: string;
  email: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const esAdmin = !!process.env.NEXT_PUBLIC_ADMIN_EMAIL && email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const items: NavItem[] = esAdmin
    ? [...NAV, { href: '/admin', key: 'admin', label: 'Administración', icon: '🔑', group: 'Admin' }]
    : NAV;

  const iniciales = empresa.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const groupStyle = { fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px' } as const;

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}

      <aside
        className={`fixed top-0 left-0 h-screen w-56 flex flex-col z-50 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ backgroundColor: '#1a1714' }}
      >
        <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Flet<span style={{ color: '#d4440c' }}>IA</span>
            </div>
            <div className="text-white/30 mt-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px' }}>
              // inteligencia para cada viaje
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-white/40 hover:text-white text-xl">×</button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {items.map((item, i) => {
            const header = i === 0 || items[i - 1].group !== item.group ? item.group : null;
            const isActive = active === item.key;
            return (
              <div key={item.href}>
                {header && <div className="px-5 my-4 text-white/25 uppercase" style={groupStyle}>{header}</div>}
                <a
                  href={item.href}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm cursor-pointer transition-colors ${isActive ? 'text-white font-medium' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                  style={isActive ? { backgroundColor: 'rgba(212,68,12,0.15)', borderLeft: '2px solid #d4440c' } : undefined}
                >
                  <span className="w-4 text-center">{item.icon}</span> {item.label}
                </a>
              </div>
            );
          })}
        </nav>

        <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ backgroundColor: '#d4440c' }}>
              {iniciales}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{empresa}</div>
              <div className="text-white/40 truncate" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>{email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-left text-white/40 hover:text-red-400 transition-colors" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
            → Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
