# Felipe Health — Deploy Guide

## Opción A: StackBlitz (sin instalar nada)

### Paso 1 — Crear proyecto
1. Ir a https://stackblitz.com
2. Click "Create new project" → elegir **Next.js**
3. StackBlitz abre el editor con el proyecto base

### Paso 2 — Reemplazar archivos
Reemplazá estos archivos con los que están en este zip:
- `package.json` → reemplazar el existente
- `next.config.js` → reemplazar el existente
- `pages/index.jsx` → **CREAR** este archivo (borrar `pages/index.tsx` si existe)
- `pages/_app.jsx` → reemplazar `pages/_app.tsx` si existe
- `pages/api/analyze.js` → **CREAR** esta carpeta y archivo
- `styles/globals.css` → reemplazar el existente

### Paso 3 — Agregar API Key en StackBlitz
En el panel izquierdo de StackBlitz:
1. Click en el ícono de **"Environment variables"** (🔒 o ⚙️)  
2. Agregar: `ANTHROPIC_API_KEY` = `sk-ant-...tu-key...`

### Paso 4 — Deploy a Vercel
1. En StackBlitz, click **"Deploy"** → **"Deploy to Vercel"**
2. Conectá tu cuenta de Vercel
3. Vercel genera una URL pública automáticamente ✅

### Paso 5 — Agregar API Key en Vercel (producción)
1. Ir a vercel.com → tu proyecto → **Settings** → **Environment Variables**
2. Agregar: `ANTHROPIC_API_KEY` = `sk-ant-...tu-key...`
3. Click **"Redeploy"** para que tome efecto

---

## Opción B: Terminal (si tenés Node + Git)

```bash
# Instalar dependencias
npm install

# Correr en local
npm run dev
# → Abre http://localhost:3000

# Deploy
git init && git add . && git commit -m "Felipe Health v1"
# Conectar con GitHub y luego Vercel CLI:
npx vercel
```

---

## Estructura del proyecto

```
felipe-health/
├── pages/
│   ├── index.jsx          ← App principal (toda la lógica)
│   ├── _app.jsx           ← Wrapper Next.js
│   └── api/
│       └── analyze.js     ← Proxy a Claude API (mantiene key segura)
├── styles/
│   └── globals.css
├── package.json
└── next.config.js
```

## Por qué la API key va en el backend
La ruta `pages/api/analyze.js` actúa como proxy:
- El browser llama a `/api/analyze` (tu servidor)
- Tu servidor llama a Anthropic con la key
- La key **nunca** aparece en el código del browser
- Si alguien inspecciona el tráfico, solo ve llamadas a tu propio dominio

## Datos y persistencia
- **Dentro de Claude:** usa `window.storage` (persistente entre sesiones)
- **En producción:** usa `localStorage` automáticamente (persiste en el browser)
- **Para datos en la nube:** conectar Supabase (próximo paso cuando quieras)

## Exportar/importar datos
Usá el botón **"EXPORTAR BACKUP"** en la tab Config antes de hacer cambios grandes.
El JSON guarda todo tu log, favoritos y objetivos.
