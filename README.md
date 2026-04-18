# Idromardi Portale Clienti

Portale client-side React per clienti Idromardi: consumi idrici, fatture, pagamenti, profilo utenza e comunicazioni. Il progetto e pronto per Vercel ed e costruito con Vite.

## Commands

```bash
npm install
npm run dev
npm run dev:server
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Struttura

```text
frontend/
  src/
    App.tsx
    main.tsx
    components/
    layout/
    pages/
    services/api.ts
    types/
  public/
  index.html
  vite.config.ts
backend/
  config/db.js
  routes/
  controllers/
  services/
```

## Ambiente

Use two environment files:

```text
frontend/.env
backend/.env
```

`frontend/.env` should contain browser-safe values only:

```env
VITE_API_BASE_URL=/api
```

`backend/.env` should contain backend-only configuration and database credentials:

```env
PORT=4000
CLIENT_ORIGIN=http://127.0.0.1:5174,http://localhost:5174
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=idromardi
DB_PORT=3306
NUMERO_UTENZA_PREFIX=400
NUMERO_UTENZA_USER_DIGITS=4
```

## Backend

The first registration endpoint is:

```text
POST /api/registration/request
```

Payload:

```json
{
  "numeroUtenza": "40010001",
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario@email.com"
}
```

The current service searches `utenze_v2` joined with `condomini_v2`. The parsed condominio code from `numeroUtenza` matches `condomini_v2.codice`; `utenze_v2.condominio_id` links to `condomini_v2.id`; active users are filtered with `u.Stato = 'ATTIVA'`. The matched row returns `Interno`; the user does not enter `Interno`. The email is supplied by the user and used for sending the confirmation code.

Create the registration tables with:

```sql
SOURCE backend/database/001_registration_tables.sql;
```

Tables:

- `registration_confirmation_codes`: temporary email confirmation requests and hashed codes.
- `activated_portal_users`: confirmed portal users linked to `utenze`.

Numero utenza parsing:

```text
40010001   => prefix 400, id_Condominio 1, id_user 1
40010001/2 => prefix 400, id_Condominio 1, id_user 1 and 2
```

`NUMERO_UTENZA_PREFIX` and `NUMERO_UTENZA_USER_DIGITS` control this split.

## Accesso Demo

Usa qualsiasi email e password nella schermata di accesso. L'autenticazione e simulata nello stato React locale, cosi il portale puo essere collegato in seguito a una vera API.

## Deploy

For Vercel, set the root directory to `frontend` and keep the Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`

If deploying from the repository root instead, use:

- Build command: `npm run build`
- Output directory: `frontend/dist`
