# Idromardi Portale Clienti

Portale client-side React per clienti Idromardi: consumi idrici, fatture, pagamenti, profilo utenza e comunicazioni. Il progetto e pronto per Vercel ed e costruito con Vite.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Struttura

```text
src/
  App.tsx
  main.tsx
  components/
  layout/
  pages/
  services/api.ts
  types/
```

## Accesso Demo

Usa qualsiasi email e password nella schermata di accesso. L'autenticazione e simulata nello stato React locale, cosi il portale puo essere collegato in seguito a una vera API.

## Deploy

Pubblica il progetto su GitHub, importalo in Vercel e mantieni le impostazioni Vite predefinite:

- Build command: `npm run build`
- Output directory: `dist`
