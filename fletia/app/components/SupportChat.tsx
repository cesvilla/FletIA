'use client';

import { useEffect } from 'react';

// Reemplazá CRISP_WEBSITE_ID con tu ID de Crisp
// Settings → Website Settings → Integration → Website ID
const CRISP_WEBSITE_ID = '50a9c756-6d22-4ce7-b1f0-42dc3d5187db';

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function SupportChat() {
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || CRISP_WEBSITE_ID === 'REEMPLAZAR_CON_TU_ID') return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Mensaje automático de bienvenida
    window.$crisp.push(['on', 'session:loaded', () => {
      window.$crisp.push(['do', 'message:send', ['text',
        '¡Hola! 👋 Bienvenido al soporte de FletIA 🚛\n¿En qué podemos ayudarte hoy?'
      ]]);
    }]);

    // Color del widget
    window.$crisp.push(['config', 'color:theme', ['green']]);

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
