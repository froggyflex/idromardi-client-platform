# Changelog

## 2026-04-20

### Docker Configuration Changes

#### `docker-compose.dev.yml`

- Changed `DB_HOST` from `host.docker.internal` to `127.0.0.1` (connect to host directly)
- Removed `extra_hosts: host.docker.internal:host-gateway` entry

#### `docker-compose.test.yml` (new file)

- Created new test stack with:
  - `test-db`: MySQL 8 container on port 3307 with schema and seed initialization
  - `backend-test`: Node 20 container with volumes mounted for live code reloading
- Backend configured to connect to `test-db` via Docker DNS (not `127.0.0.1`)
- Uses Ethereal Email SMTP credentials for test email sending

#### `.env.docker`

- Changed `DB_HOST` from `host.docker.internal` to `127.0.0.1`

---

### Backend Bug Fixes

#### `backend/config/email.js`

**Problem:** Nodemailer always sent `auth` block even when `SMTP_USER`/`SMTP_PASS` were empty, causing "Missing credentials for PLAIN" errors with servers that don't require auth.

**Fix:** Only set `auth` config if both `SMTP_USER` and `SMTP_PASS` are truthy:

```javascript
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporterConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
}
```

#### `backend/controllers/portalController.js`

**Problem:** `req.query` is `undefined` in Express 5 when no query string is present, causing `TypeError: Cannot read properties of undefined (reading 'email')`.

**Fix:** Added null checks:

```javascript
function getEmailFromRequest(req) {
  return String((req.query && req.query.email) || (req.body && req.body.email) || '').trim().toLowerCase();
}
```

#### `backend/services/registrationService.js`

**Problem:** Registration lookup used `c.codice = ?` but passed `idCondominio` (numeric ID) instead of the codice string, causing all registration requests to fail with "no match found".

**Fix:** Changed to `c.id = ?` to match on the actual foreign key:

```javascript
WHERE c.id = ?
```

---

### E2E Test Infrastructure (New)

#### `playwright.config.ts`

- Playwright configuration for chromium only
- Base URL: `http://127.0.0.1:4003`
- 30s timeout, list reporter, 1 worker

#### `tests/fixtures/schema.sql`

- Minimal `condomini_v2` table with `id INT PRIMARY KEY`, `codice VARCHAR(50)`
- Minimal `utenze_v2` table with columns needed for registration validation
- Full `registration_confirmation_codes` and `activated_portal_users` schemas

#### `tests/fixtures/seed.sql`

- `condomini_v2`: id=1, codice='400'
- `utenze_v2`: Mario Rossi (id_user=1), Luigi Verdi (id_user=2)

#### `tests/utils/db.ts`

- `getDbPool()`: MySQL connection pool to test-db on port 3307
- `cleanupTables()`: Deletes all test data from `activated_portal_users` and `registration_confirmation_codes`
- `insertActivatedUser()`: Inserts/updates user with proper Date→ISO string conversion for MySQL DATETIME
- `insertRegistrationCode()`: Inserts registration codes with proper Date→ISO string conversion

#### `tests/utils/api.ts`

- `apiGet()`, `apiPost()`, `apiPut()`: Fetch wrappers with JSON headers, return `{ status, body }`

#### `tests/utils/passwordHash.ts`

- PBKDF2 implementation matching `backend/utils/passwordHash.js` for generating test password hashes

#### `tests/health.spec.ts`

- 1 test: `GET /api/health` returns 200 with `{ status: "ok", service: "idromardi-client-api" }`

#### `tests/auth/login.spec.ts`

- 5 tests: valid login, invalid password, non-existent email, expired temp password, missing fields

#### `tests/auth/change-password.spec.ts`

- 4 tests: successful change, wrong current password, missing fields, password too short

#### `tests/registration/request.spec.ts`

- 5 tests: valid request, invalid numeroUtenza, wrong name/cognome, missing fields, invalid email format

#### `tests/registration/resend.spec.ts`

- 5 tests: successful resend, non-existent requestId (404), code still valid (400), max resend count (400), missing requestId

#### `tests/portal/me.spec.ts`

- 3 tests: get profile, non-existent email (404), missing email param (400)

#### `tests/portal/profile.spec.ts`

- 3 tests: update profile successfully, non-existent email (404), missing email

---

### Package.json Changes

**New devDependencies:**

- `@playwright/test`: `^1.52.0`
- `mysql2`: `^3.22.1`

**New scripts:**

```json
"test:e2e": "docker compose -f docker-compose.test.yml up --build -d && sleep 8 && npx playwright test && docker compose -f docker-compose.test.yml down -v",
"test:e2e:start": "docker compose -f docker-compose.test.yml up --build -d",
"test:e2e:stop": "docker compose -f docker-compose.test.yml down -v",
"test:e2e:run": "npx playwright test",
"test:e2e:headed": "npx playwright test --headed",
"test:e2e:install": "playwright install --with-deps"
```

---

### Notes

- **Ethereal Email**: Test SMTP credentials are hardcoded in `docker-compose.test.yml`. These expire periodically and may need regeneration via:

  ```bash
  node -e "const nodemailer = require('nodemailer'); nodemailer.createTestAccount().then(a => console.log(a.user, a.pass))"
  ```
- **Playwright browsers**: Must be installed before first run with `npm run test:e2e:install` (requires system dependencies, may need sudo)
- **Single worker mode**: Tests run with `--workers=1` to avoid MySQL connection conflicts between parallel test suites
