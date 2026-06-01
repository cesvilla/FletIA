# 🚛 FletIA — Inteligencia para cada viaje de tu flota

> Calculá el **costo real** de cada flete antes de salir: combustible, peajes, ruta,
> clima y tráfico. Con IA que aprende el consumo de cada camión y te dice si el
> viaje es rentable. Para transportistas y flotas de Argentina.

**Producción:** https://flet-ia.vercel.app/

---

## Qué hace

| Módulo | Descripción |
|--------|-------------|
| 🧮 **Calculadora con IA** | Costo de combustible según peso, distancia y consumo aprendido de cada camión. |
| 💰 **Costo total real** | Suma combustible + clima + peajes + costos operativos (conductor, mantenimiento/km). |
| 🎯 **Precio mínimo de flete** | Te dice el precio mínimo para no cerrar a pérdida, según tu margen objetivo. |
| 🤖 **IA que aprende** | Regresión lineal ponderada por recencia: con los litros reales de cada viaje, afina el consumo por camión. |
| 🗺️ **Ruta y mapa** | Trazado real con rutas alternativas (km, tiempo y peajes) vía ORS/OSRM + Leaflet. |
| 🌤️ **Clima en ruta** | Pronóstico por puntos del trayecto (Open-Meteo) con impacto estimado en consumo. |
| 🚦 **Tráfico real** | Incidentes y demoras sobre la ruta (TomTom), filtrados a rutas de camión. |
| ⛽ **Precio de gasoil** | Promedio nacional real desde la Secretaría de Energía (datos abiertos), cacheado por día. |
| 📊 **Rentabilidad** | Flete cobrado vs. costo real, margen y ganancia por viaje. |
| 📋 **Historial** | Todos los viajes con filtros, búsqueda y export a Excel/PDF por camión. |
| 🚛 **Gestión de flota** | Alta de camiones con specs reales de 40+ modelos del mercado argentino. |

---

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (auth + Postgres) — clientes en `lib/supabase/`
- **Leaflet / react-leaflet** para mapas
- **APIs externas:** ORS/OSRM (rutas), Open-Meteo (clima), TomTom (tráfico), Secretaría de Energía (precios), Resend (emails)
- **Deploy:** Vercel (auto-deploy desde `main`) + cron diario (`/api/cron`)

---

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev -- -p 3004
npm run test         # vitest
npm run build        # build de producción
```

### Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ORS_API_KEY=
TOMTOM_API_KEY=
RESEND_API_KEY=
ADMIN_EMAIL=
NEXT_PUBLIC_ADMIN_EMAIL=
DIAS_AVISO_VENCIMIENTO=3
CRON_SECRET=
```

---

## Estructura

```
fletia/
├── app/
│   ├── page.tsx              ← Landing
│   ├── login/ registro/      ← Auth (Supabase)
│   ├── dashboard/            ← KPIs, precio de gasoil, recordatorios
│   ├── viajes/               ← Calculadora con IA + mapa + clima + tráfico
│   ├── camiones/             ← Gestión de flota
│   ├── historial/            ← Viajes + export Excel/PDF
│   ├── rentabilidad/         ← Flete vs. costo real
│   ├── admin/                ← Panel de accesos
│   └── api/                  ← calcular, distancia, clima-ruta, trafico-ruta,
│                                precio-combustible, viajes, cron, …
├── lib/
│   ├── ai.ts                 ← Modelo de consumo + aprendizaje por camión
│   ├── peajes-ar.ts          ← Peajes de rutas argentinas
│   ├── precios.ts            ← Precio de gasoil (Sec. de Energía)
│   └── supabase/             ← Clientes server/client/admin
└── middleware.ts             ← Sesión + control de acceso
```

---

© 2026 FletIA · Argentina
