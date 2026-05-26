'use client';

import { useState, useRef, useEffect } from 'react';

const WA_NUMBER = '543816421849';
const WA_MESSAGE = encodeURIComponent('Hola! 👋 Necesito hablar con una persona del equipo de FletIA.');

interface Msg {
  from: 'bot' | 'user';
  text: string;
}

const MENU =
  '¿En qué puedo ayudarte? Escribí el número:\n\n' +
  '1️⃣  Calculadora de viajes\n' +
  '2️⃣  Mis camiones\n' +
  '3️⃣  Dashboard y reportes\n' +
  '4️⃣  Cómo funciona la IA\n' +
  '5️⃣  ¿Qué tan preciso es el cálculo?\n' +
  '6️⃣  Planes y precios\n' +
  '7️⃣  Hablar con una persona';

const RESPONSES: Record<string, string> = {
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
    '• Terreno ondulado → +7% | Montañoso → +18%\n' +
    '• Condición buena → +3% | Regular → +8%\n\n' +
    'Todos los factores se *suman* (no se multiplican) para evitar sobreestimaciones.\n\n' +
    '¿Querés saber qué tan preciso es? Escribí 5️⃣',

  '5':
    '🎯 *Precisión del cálculo*\n\n' +
    'La precisión depende de cuántos viajes reales hayas cargado en el sistema:\n\n' +
    '🟡 *Al inicio (sin datos reales):*\n' +
    'Precisión estimada: ±10 a 15%\n' +
    'Usa datos técnicos del fabricante como punto de partida.\n\n' +
    '🟢 *Con datos reales cargados (función "Enseñar IA"):*\n' +
    'Precisión estimada: ±3 a 7%\n' +
    'Cada vez que cargás los litros reales de un viaje, la IA actualiza el consumo base del camión con una ponderación 70/30 (historial vs dato nuevo).\n\n' +
    '📌 *Ejemplo real:*\n' +
    'Si el camión tenía consumo base de 27 lts/100km y mediste 29 lts/100km reales, la IA ajusta a ~27.6 lts/100km para el próximo cálculo.\n\n' +
    '💡 *Consejo:* cuantos más viajes enseñes, más precisa se vuelve la IA para tu camión específico y tus rutas habituales.',

  '6': '💰 *Planes y precios*\n\nFletIA está en fase de lanzamiento con acceso libre. Para consultas sobre planes empresariales escribinos a hola@flet-ia.com 😊',

  '7': 'WHATSAPP',
  // Keywords generales
  'calculadora': '🧮 La Calculadora está en el menú lateral. Ingresá origen, destino, peso y ruta para obtener el costo exacto. ¿Necesitás ayuda con algo específico?',
  'camion': '🚛 Gestioná tu flota desde "Mis camiones" en el menú. ¿Tenés algún problema con un camión en particular?',
  'camiones': '🚛 Gestioná tu flota desde "Mis camiones" en el menú. ¿Tenés algún problema con un camión en particular?',
  'precio': '💲 Los precios de gasoil se actualizan automáticamente cada día en el Dashboard.',
  'error': '⚠️ Para resolver el error más rápido, contanos:\n\n1. ¿En qué sección ocurrió?\n2. ¿Qué estabas haciendo?\n3. ¿Qué mensaje viste?\n\nTe ayudamos enseguida 👍',
  'contraseña': '🔑 En la pantalla de login hacé click en "¿Olvidaste tu contraseña?" y te llegará un email de recuperación.',
  'password': '🔑 En la pantalla de login hacé click en "¿Olvidaste tu contraseña?" y te llegará un email de recuperación.',
  'factura': '🧾 Por facturación escribinos a hola@flet-ia.com con el asunto "Facturación".',
  'gracias': '😊 ¡De nada! Estamos para ayudarte. Si tenés otra consulta, escribinos cuando quieras.',
  'hola': '👋 ¡Hola! ¿En qué puedo ayudarte?\n\n' + MENU,
  'buenas': '👋 ¡Hola! ¿En qué puedo ayudarte?\n\n' + MENU,

  // Keywords sobre la IA
  'ia': '🤖 Escribí *4* para ver cómo funciona la IA de FletIA, o *5* para saber qué tan preciso es el cálculo.',
  'inteligencia': '🤖 Escribí *4* para ver cómo funciona la IA de FletIA, o *5* para saber qué tan preciso es el cálculo.',
  'como funciona': '🤖 Escribí *4* para ver cómo funciona la IA de FletIA en detalle.',
  'precis': '🎯 Escribí *5* para ver la precisión del cálculo según la cantidad de datos cargados.',
  'exacto': '🎯 Escribí *5* para ver qué tan exacto es el cálculo según tus datos.',
  'exactitud': '🎯 Escribí *5* para ver la precisión del cálculo según la cantidad de datos cargados.',
  'aprend': '🧠 La IA aprende cada vez que cargás los litros reales de un viaje usando la función "Enseñar IA". Escribí *4* para saber más sobre cómo funciona.',
  'enseñar': '🧠 Con "Enseñar IA" le indicás al sistema cuántos litros consumió realmente el camión. La IA ajusta su estimación con una ponderación 70/30 para los próximos cálculos. Escribí *5* para ver la precisión esperada.',
  'consumo': '⛽ El consumo base de cada camión es el punto de partida del cálculo. La IA lo va ajustando con los datos reales que vos cargás. Escribí *4* para ver todos los factores que influyen.',
  'factor': '⚙️ Los factores que usa la IA son: peso de carga, tipo de ruta, terreno y condición del camión. Todos se suman (no multiplican) para mayor precisión. Escribí *4* para ver el detalle.',
  'kilometros': '📍 Los kilómetros se pueden calcular automáticamente ingresando origen y destino, o podés cargarlos manualmente si ya los conocés.',
  'costo': '💰 El costo total se calcula: litros estimados × precio del gasoil. Escribí *1* para ir a la Calculadora o *4* para ver cómo se estiman los litros.',
};

function getBotReply(input: string): string {
  const clean = input.trim().toLowerCase();
  if (RESPONSES[clean] !== undefined) return RESPONSES[clean];
  for (const [key, val] of Object.entries(RESPONSES)) {
    if (clean.includes(key)) return val;
  }
  return '🤔 No entendí bien. Escribí el número de una opción:\n\n1️⃣ Calculadora  |  2️⃣ Camiones\n3️⃣ Dashboard    |  4️⃣ Cómo funciona la IA\n5️⃣ Precisión      |  6️⃣ Planes\n7️⃣ Hablar con persona';
}

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Bienvenida al abrir por primera vez
  useEffect(() => {
    if (open && !started) {
      setStarted(true);
      setTyping(true);
      setTimeout(() => {
        setMsgs([{ from: 'bot', text: '¡Hola! 👋 Bienvenido al soporte de FletIA 🚛\n\nSoy el asistente automático. Puedo ayudarte al instante.' }]);
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

    const reply = getBotReply(text);

    // Si eligió hablar con persona → abrir WhatsApp
    if (reply === 'WHATSAPP') {
      setMsgs(m => [...m, { from: 'bot', text: '👤 Te conecto con una persona de nuestro equipo por WhatsApp ahora mismo...' }]);
      setTimeout(() => {
        window.open(`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`, '_blank');
      }, 800);
      return;
    }

    setTyping(true);
    setTimeout(() => {
      setMsgs(m => [...m, { from: 'bot', text: reply }]);
      setTyping(false);
    }, 700);
  }

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a6b3a, #25a855)',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(37,168,85,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        title="Soporte FletIA"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <path d="M16 4.5C10.2 4.5 5.5 9.2 5.5 15c0 2.2.66 4.24 1.8 5.94l.23.35-1.17 4.27 4.39-1.15.34.2A10.47 10.47 0 0016 25.5c5.8 0 10.5-4.7 10.5-10.5S21.8 4.5 16 4.5zm5.7 15c-.24.67-1.4 1.29-1.92 1.35-.49.06-1.1.08-1.77-.11-.41-.12-.93-.28-1.6-.55-2.81-1.21-4.64-4.04-4.78-4.23-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03 1.01-2.34.24-.25.56-.36.75-.36l.54.01c.17.008.41-.065.64.49.24.57.81 1.97.88 2.12.07.14.12.31.02.5-.1.19-.14.31-.28.47l-.42.48c-.14.14-.29.29-.12.57.17.28.74 1.22 1.59 1.97 1.09.97 2.01 1.27 2.3 1.41.28.14.45.12.62-.07.17-.19.72-.84.91-1.12.19-.28.38-.23.64-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.69-.17 1.36z" fill="#fff"/>
          </svg>
        )}
        {/* Badge punto rojo si hay mensaje no leído */}
        {!open && !started && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#ff4444', border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* Panel del chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 9998,
          width: 340, height: 480,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a6b3a, #25a855)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🚛</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Soporte FletIA</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>● En línea</div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: '#f8f8f6',
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  background: m.from === 'user' ? '#1a6b3a' : '#fff',
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
                      background: '#25a855',
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
                background: input.trim() ? '#1a6b3a' : '#ccc',
                border: 'none', borderRadius: 8,
                width: 36, height: 36, cursor: input.trim() ? 'pointer' : 'default',
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
