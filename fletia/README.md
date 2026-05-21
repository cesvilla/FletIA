# 🚛 FletIA — Sprint 1

> **App de cálculo de combustible con IA para flotas argentinas.**

¡Bienvenido al Sprint 1! Esta es la primera versión del código real de FletIA, con la estructura base, login funcional y dashboard inicial.

---

## 📋 Qué hay listo en este Sprint

✅ **Estructura del proyecto** completa
✅ **Pantalla de login** funcional con Supabase
✅ **Dashboard inicial** con tu identidad visual
✅ **Página de inicio** que redirige según si estás logueado o no
✅ **Configuración de TypeScript + Tailwind CSS**
✅ **Variables de entorno** preparadas

---

## 🚀 Cómo arrancar (paso a paso)

### Paso 1: Instalá los programas necesarios

Si todavía no lo hiciste:

1. **Node.js** (versión LTS): https://nodejs.org
2. **VS Code**: https://code.visualstudio.com
3. **Cuenta de GitHub**: https://github.com (registrate gratis)

### Paso 2: Crear cuenta de Supabase

Supabase es donde van a vivir los datos (usuarios, camiones, viajes).

1. Andá a https://supabase.com
2. Click en "Start your project" → registrate con GitHub
3. Una vez dentro, click en "New Project"
4. Datos del proyecto:
   - **Name:** `fletia`
   - **Database Password:** ponele una contraseña fuerte y **guardala**
   - **Region:** `South America (São Paulo)` (la más cercana a Argentina)
   - **Pricing Plan:** Free
5. Click en "Create new project" y esperá ~2 minutos a que se cree

### Paso 3: Conseguir las claves de Supabase

Una vez creado el proyecto:

1. En el menú de la izquierda, click en el ícono de engranaje (⚙️) → "API"
2. Vas a ver dos cosas que necesitamos:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (una clave larga que empieza con `eyJ...`)

### Paso 4: Configurar tu copia local

1. Descomprimí esta carpeta `fletia/` en tu compu (por ejemplo en `C:\Users\TuUsuario\Desktop\fletia\`)

2. Abrí esa carpeta con VS Code:
   - Abrí VS Code
   - File → Open Folder → seleccioná la carpeta `fletia`

3. Abrí la terminal integrada de VS Code:
   - Menú: `Terminal → New Terminal`
   - Se abre una terminal en la parte de abajo

4. Renombrá el archivo `.env.local.example` a `.env.local`:
   ```
   ren .env.local.example .env.local
   ```

5. Abrí ese archivo `.env.local` y pegá las claves de Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu-project-url-aca
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aca
   ```

### Paso 5: Instalar las librerías del proyecto

En la terminal de VS Code, ejecutá:

```
npm install
```

Va a descargar todas las librerías que necesita el proyecto. Tarda 1-2 minutos.

### Paso 6: Habilitar autenticación en Supabase

1. En Supabase, en el menú izquierdo: click en "Authentication" → "Providers"
2. **Email** ya debería estar activado por defecto ✅
3. Para hacer testing más fácil:
   - Authentication → Settings
   - Buscá "Confirm email" y **desactivalo** (así no necesitás confirmar email cada vez que te registrás)

### Paso 7: Arrancar el servidor de desarrollo

En la terminal de VS Code:

```
npm run dev
```

Si todo está bien, vas a ver:

```
▲ Next.js 14.2.5
- Local: http://localhost:3000
✓ Ready in 2.3s
```

### Paso 8: Abrir la app

Abrí tu navegador y andá a:

**http://localhost:3000**

🎉 ¡Deberías ver la pantalla de login de FletIA!

Probá registrarte con un email cualquiera (por ejemplo `test@test.com` con contraseña `123456`) y ver el dashboard.

---

## ❓ Si algo no funciona

**Error: "Cannot find module..."**
→ Ejecutá `npm install` de nuevo

**Error: "Invalid API key" al loguearte**
→ Revisá que las claves en `.env.local` estén correctas y que reiniciaste el servidor (Ctrl+C en la terminal y `npm run dev` de nuevo)

**Error: "Email not confirmed"**
→ Vas a Supabase → Authentication → Settings → desactivá "Confirm email"

**El npm install tarda mucho o falla**
→ Cerrá VS Code, abrí PowerShell como administrador, ejecutá `npm cache clean --force` y reintenta

---

## 📁 Estructura del proyecto

```
fletia/
├── app/                    ← Todas las páginas
│   ├── page.tsx           ← Página inicial (redirige a login o dashboard)
│   ├── login/             ← Pantalla de login y registro
│   ├── dashboard/         ← Panel principal
│   ├── camiones/          ← Gestión de camiones (próximo sprint)
│   ├── viajes/            ← Calculadora de viajes (próximo sprint)
│   ├── api/               ← Endpoints del backend
│   ├── globals.css        ← Estilos globales
│   └── layout.tsx         ← Layout que envuelve todas las páginas
├── components/            ← Componentes reutilizables
├── lib/                   ← Funciones compartidas
│   └── supabase/         ← Conexión a base de datos
├── .env.local             ← TUS claves secretas (NO subir a GitHub)
├── package.json           ← Lista de dependencias
└── README.md              ← Este archivo
```

---

## 🎯 Próximos sprints

- **Sprint 2:** Alta de camión funcional + tabla de camiones
- **Sprint 3:** Calculadora con IA real + guardado de viajes
- **Sprint 4:** Deploy a internet (Vercel)

---

¡Decime cuando lo tengas corriendo y avanzamos al Sprint 2! 🚀
