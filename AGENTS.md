# Idromardi Client Portal

## Dev Commands

```bash
npm run dev          # frontend only (port 5174)
npm run dev:server   # backend only (port 4000)
npm run typecheck    # frontend TypeScript (tsc -b frontend/tsconfig.json)
npm run lint         # frontend + backend ESLint
npm run build        # frontend build -> frontend/dist
```

For full stack: run backend first (`npm run dev:server`), then frontend (`npm run dev`).

## Environment Files

- `frontend/.env`: `VITE_API_BASE_URL=/api` (browser-safe values only)
- `backend/.env`: `PORT=4000`, `CLIENT_ORIGIN`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `NUMERO_UTENZA_PREFIX`, `NUMERO_UTENZA_USER_DIGITS`

## Architecture

- **Frontend** (`frontend/`): React 19, Vite, ESM, React Router 7, port 5174
- **Backend** (`backend/`): Express 5, CommonJS, MySQL, port 4000
- Vite proxies `/api/*` to `http://127.0.0.1:4000` (configured in `frontend/vite.config.ts`)

## Numero Utenza Format

`40010001` => prefix=400, id_Condominio=1, id_user=1
Controlled by `NUMERO_UTENZA_PREFIX` and `NUMERO_UTENZA_USER_DIGITS` in `backend/.env`.

## Registration Flow

1. `POST /api/registration/request` validates against `utenze_v2` joined with `condomini_v2`
2. Active users filtered by `u.Stato = 'ATTIVA'`
3. Condominio matched via `condomini_v2.codice`; user linked via `utenze_v2.condominio_id`
4. Setup: `SOURCE backend/database/001_registration_tables.sql`

## Database

- MySQL (`idromardi`), requires existing `utenze_v2` and `condomini_v2` tables
- Migrations in `backend/database/`: `001_registration_tables.sql`, `002_*`, `003_*`, `004_*`

## Key API Endpoints

- `POST /api/auth/login`
- `POST /api/auth/change-temporary-password`
- `GET /api/portal/me?email=...`
- `PUT /api/portal/profile`
- `POST /api/registration/request`

## Deploy

Vercel: root=`frontend`, build=`npm run build`, output=`frontend/dist`

## Workflow

- Branches: `main` + feature branches, PRs to `main`
- Order: `lint` -> `typecheck` -> `build` (lint has no auto-fix)
- ESLint ignores: `dist`, `frontend/dist`
