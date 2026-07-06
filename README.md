# Vibe CRM

Esqueleto base de la app (Next.js + Tailwind + Convex). Las pantallas se
construyen de forma incremental, una por una, siguiendo las tareas en Linear.
La especificación de diseño de referencia está en
`../Prototipo del CRM - Claude Design/design_handoff_crm_pwa/README.md`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** — tokens del Vibe CRM Design System portados a
  `src/app/globals.css` (`:root` + `[data-theme="dark"]` + `@theme inline`)
- **Convex** — base de datos; esquema en `convex/schema.ts`
- **Railway** — despliegue

## Estructura

```
src/
  app/
    layout.tsx          Root layout: fuentes (Inter, JetBrains Mono) + ConvexClientProvider
    globals.css          Tokens del design system + Tailwind
    page.tsx              Placeholder de inicio (se sustituirá al construir pantallas)
  components/
    ConvexClientProvider.tsx
convex/
  schema.ts               Tablas: users, contacts, seguimientos, interacciones, ventas
  tsconfig.json
```

Todavía no hay rutas de pantallas (`/login`, `/hoy`, `/clientes`, etc.) ni
componentes de UI: se irán añadiendo pantalla a pantalla.

## Primeros pasos

```bash
npm install
npx convex dev   # login/crea el proyecto Convex y rellena .env.local (NEXT_PUBLIC_CONVEX_URL)
npm run dev
```

`npm run build` funciona incluso sin `NEXT_PUBLIC_CONVEX_URL` (el provider es
tolerante), pero sin esa variable no hay datos reales.

## Despliegue en Railway

`railway.json` ya configura el build command para desplegar el esquema de
Convex antes de compilar Next.js:

```
npx convex deploy --cmd 'npm run build'
```

Variables de entorno necesarias en Railway:
- `CONVEX_DEPLOY_KEY` (Convex dashboard → Settings → Deploy Keys, producción)
- `NEXT_PUBLIC_CONVEX_URL` (la genera `convex deploy`, pero conviene fijarla igualmente)
