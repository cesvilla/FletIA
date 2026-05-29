'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const WA_NUMBER = '543816421849';
const WA_MSG_SOPORTE = encodeURIComponent('Hola! 👋 Necesito hablar con una persona del equipo de FletIA.');
const WA_MSG_DEMO    = encodeURIComponent('Hola! 👋 Quiero saber más sobre FletIA y pedir una demo gratuita de 15 días.');
const WA_DISPLAY     = '+54 381 642-1849';

interface Msg { from: 'bot' | 'user'; text: string; }

// ─── SOPORTE (clientes) ────────────────────────────────────────────────────
const MENU_SOPORTE =
  '¿En qué puedo ayudarte? Escribí el número:\n\n' +
  '1️⃣  Calculadora de viajes\n' +
  '2️⃣  Mis camiones\n' +
  '3️⃣  Dashboard y reportes\n' +
  '4️⃣  Cómo funciona la IA\n' +
  '5️⃣  ¿Qué tan preciso es el cálculo?\n' +
  '6️⃣  Planes y precios\n' +
  '7️⃣  Hablar con una persona';

const RESP_SOPORTE: Record<string, string> = {
  '1': '🧮 *Calculadora de viajes*\n\nAndá al menú lateral → Calculadora. Ingresá origen, destino, peso y tipo de ruta. La IA calcula combustible, costo total y kilómetros automáticamente.\n\n¿Necesitás más ayuda?',
  '2': '🚛 *Mis camiones*\n\nDesde el menú lateral → Mis camiones podés agregar, editar y ver el consumo real de cada camión de tu flota.\n\nCada camión tiene su propio perfil de consumo que la IA va ajustando con el tiempo. ¿Tenés algún problema en particular?',
  '3': '📊 *Dashboard y reportes*\n\nEl Dashboard muestra gastos, ganancias, viajes y camiones del mes en tiempo real. El Historial guarda todos los viajes con detalle completo.\n\n¿Algo más?',
  '4':
    '🤖 *Cómo funciona la IA de FletIA*\n\n' +
    'La IA calcula el costo real de combustible usando estos datos:\n\n' +
    '📌 *Datos del camión:*\n' +
    '• Consumo base del modelo (lts/100km en vacío)\n' +
    '• Capacidad máxima de carga (toneladas)\n' +
    '• Condición del vehículo (excelente/buena/regular)\n\n' +
    '📌 *Datos del viaje:*\n' +
    '• Peso de la carga\n' +
    '• Kilómetros recorridos\n' +
    '• Tipo de ruta (autopista/mixta/urbana)\n' +
    '• Tipo de terreno (plano/ondulado/montañoso)\n\n' +
    '⚙️ *Cómo evalúa cada factor:*\n' +
    '• Carga al 100% → +25% de consumo\n' +
    '• Ruta mixta → +12% | Urbana → +28%\n' +
    '• Terreno ondulado → +7% | Montañoso → +18%\n\n' +
    '¿Querés saber qué tan preciso es? Escribí 5️⃣',
  '5':
    '🎯 *Precisión del cálculo*\n\n' +
    'La precisión depende de cuántos viajes reales hayas cargado en el sistema:\n\n' +
    '🟡 *Al inicio (sin datos reales):* ±10 a 15%\n' +
    '🟢 *Con datos reales cargados:* ±3 a 7%\n\n' +
    'Cada vez que cargás los litros reales de un viaje, la IA actualiza el consumo base del camión con una ponderación 70/30.\n\n' +
    '💡 Cuantos más viajes enseñés, más precisa se vuelve la IA.',
  '6': '💰 *Planes y precios*\n\nFletIA está en fase de lanzamiento con acceso libre. Para consultas sobre planes empresariales escribinos a hola@flet-ia.com 😊',
  '7': 'WHATSAPP_SOPORTE',
  'calculadora': '🧮 La Calculadora está en el menú lateral. Ingresá origen, destino, peso y ruta para obtener el costo exacto.',
  'camion':      '🚛 Gestioná tu flota desde "Mis camiones" en el menú.',
  'camiones':    '🚛 Gestioná tu flota desde "Mis camiones" en el menú.',
  'precio':      '💲 Los precios de gasoil se actualizan automáticamente cada día en el Dashboard.',
  'error':       '⚠️ Para resolver el error más rápido, contanos:\n1. ¿En qué sección ocurrió?\n2. ¿Qué mensaje viste?\n\nTe ayudamos enseguida 👍',
  'contraseña':  '🔑 En el login hacé clic en "¿Olvidaste tu contraseña?" y te llegará un email de recuperación.',
  'password':    '🔑 En el login hacé clic en "¿Olvidaste tu contraseña?" y te llegará un email de recuperación.',
  'factura':     '🧾 Por facturación escribinos a hola@flet-ia.com con el asunto "Facturación".',
  'gracias':     '😊 ¡De nada! Estamos para ayudarte.',
  'hola':        '👋 ¡Hola! ¿En qué puedo ayudarte?\n\n' + MENU_SOPORTE,
  'ia':          '🤖 Escribí *4* para ver cómo funciona la IA, o *5* para saber qué tan preciso es el cálculo.',
  'consumo':     '⛽ El consumo base de cada camión es el punto de partida. La IA lo va ajustando con los datos reales que cargás.',
  'kilometros':  '📍 Los kilómetros se pueden calcular automáticamente ingresando origen y destino.',
};

function getReplySoporte(input: string): string {
  const clean = input.trim().toLowerCase();
  if (RESP_SOPORTE[clean]) return RESP_SOPORTE[clean];
  for (const [key, val] of Object.entries(RESP_SOPORTE)) {
    if (clean.includes(key)) return val;
  }
  return '🤔 No entendí bien. Escribí el número de una opción:\n\n1️⃣ Calculadora  |  2️⃣ Camiones\n3️⃣ Dashboard    |  4️⃣ Cómo funciona la IA\n5️⃣ Precisión      |  6️⃣ Planes\n7️⃣ Hablar con persona';
}

// ─── LANDING (pre-venta) ──────────────────────────────────────────────────
const MENU_LANDING =
  '¿En qué te puedo ayudar? Elegí una opción:\n\n' +
  '1️⃣  ¿Qué es FletIA?\n' +
  '2️⃣  ¿Cómo funciona?\n' +
  '3️⃣  Demo gratuita — 15 días\n' +
  '4️⃣  Planes y precios\n' +
  '5️⃣  Hablar con nosotros';

const RESP_LANDING: Record<string, string> = {
  '1':
    '🚛 *¿Qué es FletIA?*\n\n' +
    'FletIA es una plataforma web que calcula el costo exacto de combustible de cada viaje usando inteligencia artificial.\n\n' +
    'Ingresás origen, destino, peso de la carga y tipo de ruta — en segundos sabés cuánto te cuesta el flete y si es rentable.\n\n' +
    '✓ Sin instalar nada  ·  ✓ Sin GPS  ·  ✓ Funciona desde el celular',
  '2':
    '⚙️ *¿Cómo funciona?*\n\n' +
    '1️⃣ Registrás tu camión (marca, modelo, consumo base)\n' +
    '2️⃣ Cargás los datos del viaje (origen, destino, peso)\n' +
    '3️⃣ La IA calcula costo de combustible, margen de ganancia y si conviene el flete\n\n' +
    'Con el tiempo la IA aprende de tus viajes reales y se vuelve más precisa para tu camión y tus rutas. 🎯\n\n' +
    '¿Querés verlo en acción? Escribí *3* para la demo.',
  '3':
    '🎁 *Demo gratuita — 15 días*\n\n' +
    'Probá FletIA completo, gratis, sin tarjeta de crédito.\n\n' +
    'Incluye:\n' +
    '✓ Camiones y viajes ilimitados\n' +
    '✓ Historial y reportes completos\n' +
    '✓ IA que aprende de tu flota\n' +
    '✓ Exportación Excel y PDF\n\n' +
    '¿Querés que te guiemos en el setup? Escribí *5* para hablar con nosotros directamente.',
  '4':
    '💰 *Planes y precios*\n\n' +
    '📋 *Prueba:* Gratis — 15 días completos\n' +
    '⚡ *Pro:* $40.000/mes — hasta 10 camiones + soporte por WhatsApp\n' +
    '🏢 *Tu flota:* Precio a medida — camiones ilimitados, múltiples usuarios\n\n' +
    '¿Querés una propuesta personalizada? Escribí *5* y te ayudamos.',
  '5': 'WHATSAPP_DEMO',
  // keywords
  'demo':     'MENU_HINT_3',
  'precio':   'MENU_HINT_4',
  'precios':  'MENU_HINT_4',
  'cuanto':   'MENU_HINT_4',
  'cuánto':   'MENU_HINT_4',
  'que es':   'MENU_HINT_1',
  'qué es':   'MENU_HINT_1',
  'como':     'MENU_HINT_2',
  'cómo':     'MENU_HINT_2',
  'funciona': 'MENU_HINT_2',
  'whatsapp': 'WHATSAPP_DEMO',
  'contacto': 'WHATSAPP_DEMO',
  'hablar':   'WHATSAPP_DEMO',
  'llamar':   'WHATSAPP_DEMO',
  'hola':     '👋 ¡Hola! ¿En qué te puedo ayudar?\n\n' + MENU_LANDING,
  'buenas':   '👋 ¡Hola! ¿En qué te puedo ayudar?\n\n' + MENU_LANDING,
  'gracias':  '😊 ¡De nada! Estamos a tu disposición. Si querés probar FletIA, entrá a flet-ia.vercel.app/registro 🚛',
};

function getReplyLanding(input: string): string {
  const clean = input.trim().toLowerCase();
  if (RESP_LANDING[clean]) {
    const v = RESP_LANDING[clean];
    if (v === 'MENU_HINT_1') return RESP_LANDING['1'];
    if (v === 'MENU_HINT_2') return RESP_LANDING['2'];
    if (v === 'MENU_HINT_3') return RESP_LANDING['3'];
    if (v === 'MENU_HINT_4') return RESP_LANDING['4'];
    return v;
  }
  for (const [key, val] of Object.entries(RESP_LANDING)) {
    if (clean.includes(key)) {
      if (val === 'MENU_HINT_1') return RESP_LANDING['1'];
      if (val === 'MENU_HINT_2') return RESP_LANDING['2'];
      if (val === 'MENU_HINT_3') return RESP_LANDING['3'];
      if (val === 'MENU_HINT_4') return RESP_LANDING['4'];
      return val;
    }
  }
  return '🤔 No entendí la consulta. Elegí una opción:\n\n1️⃣ ¿Qué es FletIA?  |  2️⃣ ¿Cómo funciona?\n3️⃣ Demo gratuita  |  4️⃣ Precios\n5️⃣ Hablar con nosotros';
}

// ─── COMPONENTE ────────────────────────────────────────────────────────────
export default function SupportChat() {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  const MENU       = isLanding ? MENU_LANDING : MENU_SOPORTE;
  const getReply   = isLanding ? getReplyLanding : getReplySoporte;
  const WA_MSG     = isLanding ? WA_MSG_DEMO : WA_MSG_SOPORTE;
  const TITLE      = isLanding ? 'FletIA — Contacto' : 'Soporte FletIA';
  const STATUS     = isLanding ? '● Ventas & Demo' : '● En línea';
  const WELCOME    = isLanding
    ? '¡Hola! 👋 Bienvenido a FletIA 🚛\n\nSoy el asistente de ventas. Puedo ayudarte con dudas, demos y precios.'
    : '¡Hola! 👋 Bienvenido al soporte de FletIA 🚛\n\nSoy el asistente automático. Puedo ayudarte al instante.';

  useEffect(() => {
    if (open && !started) {
      setStarted(true);
      setTyping(true);
      setTimeout(() => {
        setMsgs([{ from: 'bot', text: WELCOME }]);
        setTyping(false);
        setTimeout(() => {
          setTyping(true);
          setTimeout(() => {
            setMsgs(m => [...m, { from: 'bot', text: MENU }]);
            setTyping(false);
          }, 900);
        }, 600);
      }, 700);
    }
  }, [open, started]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMsgs(m => [...m, { from: 'user', text }]);

    const reply = getReply(text);

    if (reply === 'WHATSAPP_SOPORTE' || reply === 'WHATSAPP_DEMO') {
      const msg = reply === 'WHATSAPP_DEMO' ? WA_MSG_DEMO : WA_MSG_SOPORTE;
      setMsgs(m => [...m, { from: 'bot', text: '📱 Te conecto por WhatsApp ahora mismo...' }]);
      setTimeout(() => {
        window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
      }, 800);
      return;
    }

    setTyping(true);
    setTimeout(() => {
      setMsgs(m => [...m, { from: 'bot', text: reply }]);
      setTyping(false);
    }, 700);
  }

  const headerGradient = isLanding
    ? 'linear-gradient(135deg, #1a1714, #3a3330)'
    : 'linear-gradient(135deg, #1a6b3a, #25a855)';
  const btnGradient = isLanding
    ? 'linear-gradient(135deg, #d4440c, #e85c20)'
    : 'linear-gradient(135deg, #1a6b3a, #25a855)';
  const btnShadow = isLanding
    ? '0 4px 20px rgba(212,68,12,0.5)'
    : '0 4px 20px rgba(37,168,85,0.5)';

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: btnGradient,
          border: 'none', cursor: 'pointer',
          boxShadow: btnShadow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        title={isLanding ? 'Contacto FletIA' : 'Soporte FletIA'}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <path d="M16 4.5C10.2 4.5 5.5 9.2 5.5 15c0 2.2.66 4.24 1.8 5.94l.23.35-1.17 4.27 4.39-1.15.34.2A10.47 10.47 0 0016 25.5c5.8 0 10.5-4.7 10.5-10.5S21.8 4.5 16 4.5zm5.7 15c-.24.67-1.4 1.29-1.92 1.35-.49.06-1.1.08-1.77-.11-.41-.12-.93-.28-1.6-.55-2.81-1.21-4.64-4.04-4.78-4.23-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03 1.01-2.34.24-.25.56-.36.75-.36l.54.01c.17.008.41-.065.64.49.24.57.81 1.97.88 2.12.07.14.12.31.02.5-.1.19-.14.31-.28.47l-.42.48c-.14.14-.29.29-.12.57.17.28.74 1.22 1.59 1.97 1.09.97 2.01 1.27 2.3 1.41.28.14.45.12.62-.07.17-.19.72-.84.91-1.12.19-.28.38-.23.64-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.69-.17 1.36z" fill="#fff"/>
          </svg>
        )}
        {!open && !started && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#ff4444', border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 9998,
          width: 340, height: 500,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}>
          {/* Header */}
          <div style={{ background: headerGradient, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isLanding ? 10 : 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>🚛</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{TITLE}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{STATUS}</div>
              </div>
            </div>

            {/* Número de contacto — solo en landing */}
            {isLanding && (
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG_DEMO}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 12px',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              >
                <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4.5C10.2 4.5 5.5 9.2 5.5 15c0 2.2.66 4.24 1.8 5.94l.23.35-1.17 4.27 4.39-1.15.34.2A10.47 10.47 0 0016 25.5c5.8 0 10.5-4.7 10.5-10.5S21.8 4.5 16 4.5z" fill="rgba(255,255,255,0.9)"/>
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
                  {WA_DISPLAY}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 'auto' }}>
                  WhatsApp →
                </span>
              </a>
            )}
          </div>

          {/* Mensajes */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: '#f8f8f6',
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  background: m.from === 'user'
                    ? (isLanding ? '#d4440c' : '#1a6b3a')
                    : '#fff',
                  color: m.from === 'user' ? '#fff' : '#222',
                  borderRadius: m.from === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '9px 12px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: '#fff', borderRadius: '12px 12px 12px 2px',
                  padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isLanding ? '#d4440c' : '#25a855',
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                      display: 'inline-block',
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #eee',
            display: 'flex', gap: 8, background: '#fff',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escribí tu consulta..."
              style={{
                flex: 1, border: '1px solid #e0e0e0', borderRadius: 8,
                padding: '8px 12px', fontSize: 13, outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              style={{
                background: input.trim()
                  ? (isLanding ? '#d4440c' : '#1a6b3a')
                  : '#ccc',
                border: 'none', borderRadius: 8,
                width: 36, height: 36,
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
