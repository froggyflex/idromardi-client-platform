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
PUBLIC_DOCUMENTS_BASE_URL=https://pub-88533bf9f0424d64ba01c1a996f49c0e.r2.dev
PUBLIC_DOCUMENTS_OBJECT_PREFIX=generated-documents
```

`PUBLIC_DOCUMENTS_BASE_URL` must point to the public Cloudflare/R2 documents base URL when
`ripartizione_pdfs.filepath` stores only an object path or filename. If `filepath` already stores
the full `https://...` document URL, this setting is not required.
`PUBLIC_DOCUMENTS_OBJECT_PREFIX` maps legacy local paths like `/storage/ripartizioni/.../file.pdf`
to the R2 folder where the objects actually exist.

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
  "fiscalCode": "RSSMRA80A01H501U",
  "password": "password-sicura"
}
```

The current service searches `utenze_v2` joined with `condomini_v2`. The parsed condominio code from `numeroUtenza` matches `condomini_v2.codice`; `utenze_v2.condominio_id` links to `condomini_v2.id`; active users are filtered with `u.Stato = 'ATTIVA'`. The account is created immediately only when numero utenza, cognome and codice fiscale match the database.

Create the registration tables with:

```sql
SOURCE backend/database/001_registration_tables.sql;
```

Tables:

- `registration_confirmation_codes`: legacy temporary confirmation requests.
- `activated_portal_users`: confirmed portal users linked to `utenze`.

Numero utenza parsing:

```text
40010001   => prefix 400, id_Condominio 1, id_user 1
40010001/2 => prefix 400, id_Condominio 1, id_user 1 and 2
```

`NUMERO_UTENZA_PREFIX` and `NUMERO_UTENZA_USER_DIGITS` control this split.

## Accesso Demo

Usa il numero utenza e la password nella schermata di accesso.

## Deploy

For Vercel, set the root directory to `frontend` and keep the Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`

If deploying from the repository root instead, use:

- Build command: `npm run build`
- Output directory: `frontend/dist`

## Testing

### E2E Tests (Playwright)

```bash
# Run all 26 tests (spins up Docker containers automatically)
npm run test:e2e

# Start containers only
npm run test:e2e:start

# Run tests against running containers
npm run test:e2e:run

# Stop and clean up
npm run test:e2e:stop

# Run with visible browser (headed)
npm run test:e2e:headed

# Install Playwright browsers
npm run test:e2e:install
```

### Test Structure

| File | Tests |
|------|-------|
| `tests/health.spec.ts` | Health endpoint (1 test) |
| `tests/auth/login.spec.ts` | Login flow (6 tests) |
| `tests/auth/change-password.spec.ts` | Change password (4 tests) |
| `tests/registration/request.spec.ts` | Registration request (5 tests) |
| `tests/registration/resend.spec.ts` | Resend confirmation code (5 tests) |
| `tests/portal/me.spec.ts` | Get user profile (3 tests) |
| `tests/portal/profile.spec.ts` | Update profile (3 tests) |

**Total: 26 tests**

### Test Fixtures

- Schema: `tests/fixtures/schema.sql`
- Seed data: `tests/fixtures/seed.sql`

### Quality Checks

```bash
# TypeScript type checking
npm run typecheck

# ESLint linting
npm run lint
```

## Docker Development

### Start Dev Stack

```bash
docker compose -f docker-compose.dev.yml up -d
```

Services:
- **Frontend**: http://localhost:5174
- **Backend**: http://localhost:4002 (mapped to container port 4000)
- **MySQL**: via `host.docker.internal` (no local container)

### Start Test Stack

```bash
docker compose -f docker-compose.test.yml up -d
```

Services:
- **Test DB**: localhost:3307
- **Test Backend**: http://localhost:4003

### Test DB Connection

From host to Docker MySQL:

```bash
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione
```

## Database Migrations

Migrations are in `backend/database/`. Apply in order:

```bash
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/001_registration_tables.sql
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/002_expire_duplicate_registration_codes.sql
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/003_add_password_fields_to_activated_users.sql
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/004_drop_redundant_portal_profile_fields.sql
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/005_add_resend_count_to_registration_codes.sql
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/006_fix_id_auto_type.sql
docker exec -i idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione < backend/database/008_use_numero_utenza_login.sql
```

### Inspect Table Structure

```sql
DESCRIBE activated_portal_users;
DESCRIBE registration_confirmation_codes;
DESCRIBE utenze_v2;
DESCRIBE condomini_v2;
```

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5174

DB_HOST=host.docker.internal
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=miteamx1_fatturazione
DB_PORT=3306

NUMERO_UTENZA_PREFIX=400
NUMERO_UTENZA_USER_DIGITS=4
PUBLIC_DOCUMENTS_BASE_URL=https://pub-88533bf9f0424d64ba01c1a996f49c0e.r2.dev
PUBLIC_DOCUMENTS_OBJECT_PREFIX=generated-documents

HTTP_RESPONSE_TIMEOUT_MS=15000
DB_CONNECT_TIMEOUT_MS=8000

# Registration and password reset do not require external messaging credentials.
```

### Frontend (.env)

```env
VITE_API_BASE_URL=/api
```

### Docker Compose Overrides

| Variable | Dev Compose | Notes |
|----------|-------------|-------|
| `DB_HOST` | `host.docker.internal` | Host machine MySQL |
| `DB_NAME` | `miteamx1_fatturazione` | Dev database name |
Registration and password reset do not require external messaging credentials.

## Database Operations

### Unregister a User

Remove a user from the portal and clear their pending registration codes:

```sql
-- Delete from activated_portal_users
DELETE FROM activated_portal_users WHERE access_identifier = '40010001';

-- Delete pending registration codes
DELETE FROM registration_confirmation_codes WHERE request_id = 'uuid-here';
```

Via Docker:
```bash
docker exec idromardi-v2-db-1 mysql -uroot -prootpassword miteamx1_fatturazione -e "DELETE FROM activated_portal_users WHERE access_identifier = '40010001';"
```

### Check User Exists

```sql
SELECT * FROM activated_portal_users WHERE access_identifier = '40010001';
```

## Registration Flow

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/registration/request` | POST | Request registration code |

### Request Payload

```json
{
  "numeroUtenza": "40010001",
  "nome": "Mario",
  "cognome": "Rossi",
  "fiscalCode": "RSSMRA80A01H501U",
  "password": "password-sicura"
}
```

### Response (success)

```json
{
  "message": "Account creato correttamente. Ora puoi accedere con il numero utenza e la password scelta.",
  "accessIdentifier": "40010001"
}
```

### Numero Utenza Format

```
40010001     => prefix=400, condominio=1, user=1
40010001/2   => prefix=400, condominio=1, users=[1, 2]
```

### User Matching Rules

1. `condomini_v2.codice` must match parsed `idCondominio`
2. `utenze_v2.id_user` must be IN parsed user IDs
3. `utenze_v2.Nome` must match `nome` (case-insensitive, trimmed)
4. `utenze_v2.Cognome` must match `cognome` (case-insensitive, trimmed)
5. `utenze_v2.Stato` must equal `'ATTIVA'`
