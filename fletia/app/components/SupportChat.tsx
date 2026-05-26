'use client';

import { useEffect } from 'react';

const CRISP_WEBSITE_ID = '50a9c756-6d22-4ce7-b1f0-42dc3d5187db';

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

// Respuestas automáticas del bot
const BOT_RESPONSES: Record<string, string> = {
  // Opciones del menú
  '1': '🧮 *Calculadora de viajes*\n\nPodés calcular el costo de cualquier viaje desde la sección "Calculadora" en el menú lateral.\n\nIngresá origen, destino, peso y tipo de ruta — la IA calcula combustible, costo y km automáticamente. 🚛',
  '2': '🚛 *Mis camiones*\n\nPodés agregar y gestionar tu flota desde la sección "Mis camiones".\n\nSi tu camión no aparece en la lista de modelos, elegí el más similar en consumo y capacidad.',
  '3': '📊 *Dashboard y reportes*\n\nEl Dashboard muestra tus gastos del mes, ganancias, viajes y camiones activos en tiempo real.\n\nEl Historial guarda todos tus viajes calculados con detalle completo.',
  '4': '💰 *Planes y precios*\n\nActualmente FletIA está en fase de lanzamiento con acceso libre.\n\nPara consultar planes empresariales escribinos a hola@flet-ia.com o seguí chateando acá. 😊',
  '5': '👨‍💻 *Hablar con una persona*\n\nUn miembro de nuestro equipo va a responder tu consulta a la brevedad.\n\nNuestro horario de atención es de lunes a viernes de 9 a 18hs (Argentina). ¡Dejanos tu mensaje!',

  // Keywords en español
  'calculadora': '🧮 La Calculadora está en el menú lateral. Ingresá origen, destino, peso y tipo de ruta para obtener el costo exacto del viaje. ¿Necesitás más ayuda con eso?',
  'camion': '🚛 Podés gestionar tu flota desde "Mis camiones" en el menú. ¿Tenés algún problema en particular con tu camión?',
  'camiones': '🚛 Podés gestionar tu flota desde "Mis camiones" en el menú. ¿Tenés algún problema en particular?',
  'precio': '💲 Los precios de gasoil se actualizan automáticamente cada día en el Dashboard. Si el precio está desactualizado, recargá la página.',
  'error': '⚠️ Lamentamos el inconveniente. Para resolver el error más rápido, describinos:\n1. ¿En qué sección ocurrió?\n2. ¿Qué estabas haciendo?\n3. ¿Qué mensaje de error viste?',
  'contraseña': '🔑 Para recuperar tu contraseña, andá a la pantalla de login y hacé click en "¿Olvidaste tu contraseña?". Te llegará un email con el enlace de recuperación.',
  'password': '🔑 Para recuperar tu contraseña, andá al login y hacé click en "¿Olvidaste tu contraseña?". Te llegará un email de recuperación.',
  'factura': '🧾 Por consultas de facturación escribinos directamente a hola@flet-ia.com con el asunto "Facturación".',
  'hola': null, // no responder a saludos simples, el menú ya saluda
  'gracias': '😊 ¡De nada! Estamos para ayudarte. Si tenés otra consulta no dudes en escribirnos.',
};

const MENU_MESSAGE =
  '¿En qué podemos ayudarte? Respondé con el número de tu consulta:\n\n' +
  '1️⃣  Calculadora de viajes\n' +
  '2️⃣  Mis camiones\n' +
  '3️⃣  Dashboard y reportes\n' +
  '4️⃣  Planes y precios\n' +
  '5️⃣  Hablar con una persona';

const FALLBACK_MESSAGE =
  '🤔 No entendí bien tu consulta. Podés escribir el número de una opción:\n\n' +
  '1️⃣  Calculadora  |  2️⃣  Camiones\n' +
  '3️⃣  Dashboard    |  4️⃣  Planes\n' +
  '5️⃣  Hablar con una persona';

function getBotReply(userMessage: string): string | null {
  const msg = userMessage.trim().toLowerCase();

  // Respuesta exacta por número o keyword
  if (BOT_RESPONSES[msg] !== undefined) {
    return BOT_RESPONSES[msg]; // puede ser null (ignorar)
  }

  // Buscar keyword dentro del mensaje
  for (const [key, reply] of Object.entries(BOT_RESPONSES)) {
    if (msg.includes(key) && reply !== null) {
      return reply;
    }
  }

  // Fallback
  return FALLBACK_MESSAGE;
}

export default function SupportChat() {
  useEffect(() => {
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Color verde FletIA
    window.$crisp.push(['config', 'color:theme', ['green']]);

    // Texto del botón del widget
    window.$crisp.push(['config', 'chat:welcome:message', [
      '¡Hola! 👋 Bienvenido al soporte de FletIA 🚛',
    ]]);

    // Cuando se abre el chat por primera vez → saludo + menú
    window.$crisp.push(['on', 'chat:opened', () => {
      const msgs: unknown[] = (window.$crisp as unknown as { get: (k: string) => unknown }).get
        ? []
        : [];
      // Solo enviar bienvenida si es sesión nueva (sin mensajes previos)
      setTimeout(() => {
        window.$crisp.push(['do', 'message:show', ['text',
          '¡Hola! 👋 Bienvenido al soporte de *FletIA* 🚛\n\nSoy el asistente automático. Puedo ayudarte con las consultas más frecuentes al instante.',
        ]]);
        setTimeout(() => {
          window.$crisp.push(['do', 'message:show', ['text', MENU_MESSAGE]]);
        }, 800);
      }, 400);
      void msgs;
    }]);

    // Escuchar mensajes del usuario y responder automáticamente
    window.$crisp.push(['on', 'message:received', (message: { type: string; content: string; origin: string }) => {
      if (message.type !== 'text' || message.origin === 'operator') return;

      const reply = getBotReply(message.content);
      if (reply === null) return; // ignorar (ej: "hola" ya tiene bienvenida)

      setTimeout(() => {
        window.$crisp.push(['do', 'message:show', ['text', reply]]);
        // Si eligió "hablar con persona" (5), no mostrar menú de nuevo
        if (message.content.trim() !== '5') {
          setTimeout(() => {
            window.$crisp.push(['do', 'message:show', ['text',
              '¿Puedo ayudarte con algo más? Respondé con un número del menú o escribí tu consulta libremente. 😊'
            ]]);
          }, 1200);
        }
      }, 600);
    }]);

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  return null;
}
