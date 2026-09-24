# Benefit Illustration Module

A full-stack web app that prices a life insurance policy and shows what it pays back, year by year. A customer registers, picks a plan, enters the policyholder's details, and gets a live premium quote. They can then save a full benefit illustration: a year-by-year table and chart of premiums, bonuses, death benefit, surrender value and maturity benefit.

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, React Router, React Hook Form |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 through Prisma 7 |
| Validation | Zod: one set of schemas, shared by the browser and the server |
| Money | decimal.js: exact decimal arithmetic, never JavaScript floats |
| Auth and security | bcrypt, JWT, AES-256-GCM field encryption, helmet, rate limiting |
| Tests | Vitest and Supertest (101 tests) |

> **About the calculation rules.** The assignment's spreadsheet (Inputs and Illustrations sheets) could not be opened: the shared link returns "Page not found". The five input validations, the premium formula and the illustration columns are therefore reasonable, clearly isolated stand-ins. Section 7 lists exactly which files to change once the spreadsheet is available.

---

## Contents

1. [What the app does](#1-what-the-app-does)
2. [Project structure](#2-project-structure)
3. [Getting started, step by step](#3-getting-started-step-by-step)
4. [Using the app, step by step](#4-using-the-app-step-by-step)
5. [How a calculation flows through the system](#5-how-a-calculation-flows-through-the-system)
6. [The calculation, step by step](#6-the-calculation-step-by-step)
7. [The five input validations](#7-the-five-input-validations)
8. [Data model](#8-data-model)
9. [Authentication and protecting customer data](#9-authentication-and-protecting-customer-data)
10. [Secrets and environment management](#10-secrets-and-environment-management)
11. [Scaling to millions of inputs](#11-scaling-to-millions-of-inputs)
12. [API reference](#12-api-reference)
13. [Tests](#13-tests)
14. [Known gaps and next steps](#14-known-gaps-and-next-steps)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. What the app does

| Screen | Route | Purpose |
| --- | --- | --- |
| Login / Register | `/login` | Create an account or sign in |
| New illustration (Policy Calculation) | `/calculate` | Choose a plan, enter details, see a live quote, generate an illustration |
| Illustration | `/illustration/:id` | Summary figures, a benefit chart, and the year-by-year table |
| Saved illustrations | `/history` | Every saved illustration, filterable by plan, each expandable to show its coverage |
| Profile | `/profile` | Your masked personal details, with a password-protected option to reveal them |
| How it works | `/how-it-works` | The eligibility rules and every formula, in plain language |

The left sidebar menu links every screen. On phones it becomes a slide-out drawer.

---

## 2. Project structure

The project is an npm workspaces monorepo with three packages:

```
assesments/
├─ packages/
│  ├─ core/                 Pure calculation library, with no database, network or clock
│  │  ├─ src/
│  │  │  ├─ types/          PolicyType, Rider, PremiumOption, RateTable, Product
│  │  │  ├─ calc/           age.ts, money.ts, illustration.ts (the engine)
│  │  │  ├─ validation/     illustrationInput.ts (the 5 rules), auth.ts (register and login schemas)
│  │  │  └─ data/           sampleProducts.ts (the sample catalogue)
│  │  └─ tests/             age, validation and engine tests
│  │
│  ├─ api/                  Express server
│  │  ├─ prisma/            schema.prisma, migrations, seed.ts
│  │  ├─ src/
│  │  │  ├─ config/         env.ts: validates every environment variable at startup
│  │  │  ├─ crypto/         fieldCipher.ts: AES-256-GCM encryption and HMAC lookup hashing
│  │  │  ├─ middleware/     auth.ts (JWT check), errorHandler.ts (one error format)
│  │  │  ├─ routes/         auth, me, policies, illustrations
│  │  │  ├─ services/       catalog (products from the DB, cached), tokens (JWT), mask
│  │  │  ├─ bulk/           runBulk.ts, worker.ts, generateSample.ts
│  │  │  ├─ app.ts          Builds the Express app (used by the server and by the tests)
│  │  │  └─ index.ts        Entry point: load config, connect to the DB, listen
│  │  └─ tests/             crypto, config and HTTP tests
│  │
│  └─ web/                  React app
│     └─ src/
│        ├─ api/            axios client (token handling, automatic refresh), response types
│        ├─ auth/           AuthProvider and the useAuth hook
│        ├─ components/     Layout (sidebar), PageHeader, BenefitChart, Field, Icon, PolicyDetails
│        ├─ pages/          Login, Calculate, Illustration, History, Profile, HowItWorks
│        └─ lib/            Indian-rupee formatting, dates
│
├─ docker-compose.yml       Local PostgreSQL
└─ package.json             Workspace scripts: setup, dev, test, typecheck, bulk
```

**Why a separate `core` package?** The calculation must behave the same wherever it runs: in the browser for instant validation, in the API for the real quote, and in a bulk worker processing millions of rows. `core` has no dependencies on a database, a web server, environment variables or the current time. Any of those three environments can import it unchanged.

---

## 3. Getting started, step by step

**Prerequisites:** Node.js 22 or later, npm 10 or later, and Docker Desktop.

**Step 1: Install dependencies**

```bash
npm install
```

npm 11 blocks packages' install scripts by default. `bcrypt` (native code), Prisma (its engines) and `esbuild` need theirs, and the root `package.json` already allows them under `allowScripts`. If npm still reports blocked scripts, run:

```bash
npm install-scripts approve bcrypt prisma @prisma/engines esbuild && npm rebuild
```

**Step 2: Create the environment file**

```bash
cp packages/api/.env.example packages/api/.env
```

Fill in the secrets. Each line in `.env.example` includes the command that generates its value, for example:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET, and again for JWT_REFRESH_SECRET
openssl rand -base64 32   # PII_ENCRYPTION_KEYS (as "1:<value>") and PII_HMAC_KEY
```

**Step 3: Start the database, apply migrations and load sample products**

```bash
npm run setup
```

This one command does three things:
1. `docker compose up -d --wait` starts PostgreSQL on port **5433**. It uses 5433 rather than 5432 so it doesn't clash with any other local Postgres.
2. `prisma migrate deploy` creates the tables.
3. `prisma db seed` loads two sample plans, with their riders, premium options and rate tables.

**Step 4: Run the app**

```bash
npm run dev
```

This starts the API on http://localhost:4000 and the web app on http://localhost:5173. The web app forwards `/api` requests to the API, so the browser only ever talks to one address.

**Step 5: Open http://localhost:5173 and register an account.**

**Other commands**

| Command | What it does |
| --- | --- |
| `npm test` | Runs all 101 unit and API tests |
| `npm run typecheck` | Type-checks all packages and builds the web app |
| `npm run bulk -- in.csv out.csv` | Runs the bulk illustration runner (see section 11) |
| `npm run db:down` | Stops the database container |

---

## 4. Using the app, step by step

**Step 1: Register.** Enter your full name, email, date of birth, mobile number and a password. Validation runs as you leave each field. When you submit, your personal details are encrypted before they reach the database (section 9), and you're signed in straight away.

**Step 2: Choose a plan.** The calculation page shows each plan as a card with its limits: entry age, policy term and sum-assured range. Open **Plan details** on the right to see all the limits and the payment-frequency factors.

**Step 3: Enter the policyholder's details.**
- **Date of birth.** The form immediately shows the age at last birthday.
- **Gender.**
- **Sum assured.** Shown back in words ("10 lakh") so zeros are easy to check.
- **Policy term and premium paying term**, each with its allowed range underneath.
- **Payment frequency:** annual, half-yearly, quarterly or monthly, depending on the plan.
- **Riders (optional):** add-on covers, each showing its cover amount and yearly cost.

**Step 4: Read the live quote.** As soon as every input passes the plan's rules, the **Your premium** panel shows the instalment, the rider costs, total premiums and the maturity benefit. It recalculates 350 ms after you stop typing, and nothing is saved at this stage. If an input breaks a rule, the field turns red and shows which rule.

**Step 5: Generate the illustration.** Click **Generate illustration**. The server validates and calculates again, saves the illustration, and opens the Illustration page.

**Step 6: Read the illustration.**
- **Summary cards:** sum assured, premium, total premiums, and the maturity benefit (with how many times the premiums it pays back).
- **Chart:** death benefit and premiums paid for each policy year, with the maturity payout marked. Hover over it to see every value for a year.
- **Table:** every policy year, with each column explained in section 6. A dashed line marks the year premiums stop, and the maturity year is highlighted.
- **Print** produces a clean printed copy.

**Step 7: Review saved illustrations.** **Saved illustrations** lists everything you've generated, with tabs for each plan. Click a row to expand it and see its coverage breakdown and maturity benefit.

**Step 8: View your profile.** Your details are shown masked (`R••• S•••••`, `••••••3210`). To see them in full, re-enter your password. Each reveal is recorded in the audit log.

---

## 5. How a calculation flows through the system

These are the steps between typing a value and seeing a number:

1. **The browser checks the input.** React Hook Form runs the same Zod schema the server uses (`createIllustrationSchema` from `core`), built for the selected plan and today's date. Errors appear under the field that caused them.
2. **The browser asks for a preview.** Once the inputs pass, the page waits 350 ms for typing to stop, then sends `POST /api/illustrations/preview`. The request carries the access token in its `Authorization` header.
3. **The server authenticates.** The `requireAuth` middleware checks the JWT's signature, issuer, audience and expiry.
4. **The server validates again.** The client can't be trusted, so the API validates the field types first, then loads the plan from the catalogue and runs the five rules. Any failure returns HTTP 400 with every problem listed against its field.
5. **The server fixes the valuation date.** "Today" is taken in the `Asia/Kolkata` timezone, so a server running in UTC can't get a customer's age wrong on their birthday.
6. **The engine calculates.** `generateIllustration(input, plan, rates, today)` runs entirely in memory and returns the premium breakdown, one row per policy year, and a summary.
7. **The server sends the result.** Every money value goes out as a string with two decimal places (`"80400.00"`), because JSON numbers are floats and could lose paise.
8. **Saving is a separate request.** `POST /api/illustrations` repeats steps 3–7, then stores the **inputs**, the valuation date and the rate-table version. It doesn't store the output rows.
9. **Reopening regenerates the illustration.** `GET /api/illustrations/:id` decrypts the stored date of birth, loads the rate table by its saved version, and runs the engine again with the saved valuation date. The same inputs, date and rates always produce the same numbers, so the rows never need to be stored.

---

## 6. The calculation, step by step

The engine is in `packages/core/src/calc/illustration.ts`.

**Step 1: Age.** Age is taken at the last completed birthday on the valuation date, as the brief allows. Someone born on 29 February has their birthday on 1 March in non-leap years, so on 28 February 2025 a person born on 29 February 2000 is 24.

**Step 2: Rating age.** For female lives the rate is taken 3 years younger, a standard pricing convention.

**Step 3: Annual base premium**

```
annual base premium = sum assured ÷ 1,000 × rate(rating age) × policy term ÷ premium paying term
```

The rate per ₹1,000 of cover comes from the plan's rate table, by age band. The `policy term ÷ premium paying term` factor squeezes the same total into fewer years when premiums stop before the policy ends.

**Step 4: Rider premiums**

```
rider cover   = sum assured × rider cover %
rider premium = rider cover ÷ 1,000 × rider rate
```

**Step 5: Instalment**

```
instalment = (base + rider premiums) × modal factor, rounded to paise
```

The modal factors are 1 (annual), 0.51 (half-yearly), 0.26 (quarterly) and 0.0875 (monthly). Paying more often costs slightly more in total.

**Step 6: Project each policy year, t = 1 to the policy term**

| Column | Formula |
| --- | --- |
| Policy year, Age | t, and entry age + t − 1 |
| Base / rider / total premium | instalment × instalments per year, while t ≤ premium paying term; after that 0 |
| Cumulative premium | Running total of premiums paid |
| Sum assured | Fixed |
| Bonus | sum assured × reversionary bonus rate (a simple bonus, not compounding) |
| Accrued bonus | Running total of bonuses |
| Death benefit | max(sum assured, 10 × annual premium, 105% of premiums paid) + accrued bonus |
| Surrender value | base premiums paid × surrender factor for year t (0 in year 1) |
| Maturity benefit | At t = policy term only: sum assured + accrued bonus × (1 + terminal bonus rate) |
| Net cash flow | benefit received − premium paid |

**Worked example.** This is a test in the code.

Inputs: Secure Endowment Plan, male aged 30, sum assured ₹10,00,000, policy term 20 years, premium paying term 10 years, annual payments, no riders.

| Step | Value |
| --- | --- |
| Rate at age 30 | ₹40.20 per ₹1,000 |
| Annual premium | 1,000 × 40.20 × 20 ÷ 10 = **₹80,400** |
| Bonus each year | ₹10,00,000 × 4.5% = ₹45,000 |
| Death benefit, year 1 | max(₹10,00,000, ₹8,04,000, ₹84,420) + ₹45,000 = **₹10,45,000** |
| Surrender value, year 10 | ₹8,04,000 × 0.60 = **₹4,82,400** |
| Maturity benefit, year 20 | ₹10,00,000 + ₹9,00,000 + 15% × ₹9,00,000 = **₹20,35,000** |

**Money rules**
- Every calculation uses `decimal.js`. JavaScript floats can't represent paise exactly: adding ₹1,990.63 twelve times in floats gives 23887.56000000001.
- Values are rounded only where money is actually charged (the instalment) or displayed. They are never rounded between steps, because rounding inside a 30-year loop compounds the error.
- A missing rate throws `RateNotFoundError`. It never falls back to zero, because a silently wrong illustration is the worst possible failure here.

---

## 7. The five input validations

The rules are in `packages/core/src/validation/illustrationInput.ts`, in the `ILLUSTRATION_RULES` list. Every limit comes from the selected plan's data, and every limit is inclusive.

| # | Rule | Field it reports on | Sample limit (Endowment) |
| --- | --- | --- | --- |
| 1 | Entry age is within the plan's range | Date of birth | 18 to 55 years |
| 2 | Sum assured is within the plan's range | Sum assured | ₹1,00,000 to ₹1,00,00,000 |
| 3 | Policy term is within the plan's range | Policy term | 10 to 30 years |
| 4 | Premium paying term is at least the minimum and no longer than the policy term | Premium paying term | 5 years up to the policy term |
| 5 | Entry age + policy term does not exceed the maximum maturity age | Policy term | 75 years |

Rules 4 and 5 compare two fields, which is why they're written against the whole input rather than as single-field checks.

The same schema also rejects choices the plan doesn't offer: a payment frequency it doesn't allow, an unknown rider, or the same rider twice. All failures are reported together, each against its field.

**Swapping in the spreadsheet's rules.** When the spreadsheet is available, change these files:
1. `ILLUSTRATION_RULES` and `illustrationInputShape` in `packages/core/src/validation/illustrationInput.ts`
2. `calculatePremium`, `generateIllustration` and `ILLUSTRATION_COLUMNS` in `packages/core/src/calc/illustration.ts`
3. The limits and rates in `packages/core/src/data/sampleProducts.ts`, then run `npm run db:seed`
4. The test values in `packages/core/tests/`, taking the expected figures from the Illustrations sheet

If the sheet's inputs differ from these (for example, if it takes the premium as an input rather than the sum assured), these also need updating:
- the form in `packages/web/src/pages/CalculatePage.tsx`
- the `Illustration` model in `packages/api/prisma/schema.prisma`, followed by a migration
- the bulk CSV columns in `packages/api/src/bulk/`

The chart, the How it works page and this README describe the current formulas, so update them too.

---

## 8. Data model

The data model is in `packages/api/prisma/schema.prisma`.

| Table | What it holds |
| --- | --- |
| `User` | The email as an HMAC hash (for login lookup) and as ciphertext. The bcrypt password hash. The name, DOB and mobile as ciphertext. The first initial and the last 4 digits of the mobile, for display. `tokenVersion`, which logout increments. |
| `PolicyType` | A plan and its limits: age, policy term, premium paying term, sum assured and maximum maturity age |
| `Rider` | An add-on cover for a plan: rate per ₹1,000 and cover % of the sum assured |
| `PremiumOption` | A payment frequency for a plan: modal factor and instalments per year |
| `RateTable` | Versioned assumptions, stored as JSON: premium rates by age band, female age setback, bonus rates and surrender factors. Only one version is active per plan. |
| `Illustration` | A saved illustration's inputs (with the DOB encrypted), its valuation date, its rate version, and summary figures for the list view |
| `AuditLog` | Security events: register, login, failed login, logout, PII reveal, illustration create. IP addresses are stored as hashes. |

**Design decisions**
- **Money is `Decimal(15,2)`** in the database, never a float.
- **Rates are data, not code.** A new rate table is a new row with a new version, so pricing changes need no deployment.
- **Only inputs are stored, not output rows.** A 20-year illustration is one row instead of twenty. At millions of illustrations, that is the difference between millions of rows and tens of millions. The rate version and valuation date make every saved illustration exactly reproducible.
- **Rate JSON is validated on load.** A malformed rate table fails loudly rather than producing a wrong premium.

---

## 9. Authentication and protecting customer data

The brief asks that name, DOB and mobile be kept safe and masked in the database. The app does two things: **it encrypts personal data at rest, and masks it wherever it's shown.**

**What happens when you register**
1. The input is validated: name, a valid email, a password with at least 8 characters including a letter and a digit, a real calendar date for the DOB, and a 10-digit Indian mobile number starting 6–9.
2. The email is normalised to lowercase and hashed with HMAC-SHA256 and a secret key. That hash is how the login finds you. It can't be reversed, and it can't be guessed without the key.
3. The email, name, DOB and mobile are each encrypted with **AES-256-GCM**, using a fresh random IV every time:
   - GCM is authenticated, so a tampered value fails to decrypt rather than returning garbage.
   - The column name is bound into each ciphertext, so a value copied from the mobile column into the name column won't decrypt.
   - Each ciphertext starts with a key-version byte, so keys can be rotated (section 10).
4. The password is hashed with **bcrypt, cost 12**.
5. Only the first initial and the last 4 digits of the mobile are stored in plain text, so list views never need to decrypt anything.
6. A `REGISTER` event is written to the audit log.

After this, `SELECT * FROM "User"` shows only hashes and ciphertext.

**What happens when you sign in**
1. The user is looked up by the email's HMAC hash.
2. The password is checked with bcrypt. If the email doesn't exist, the password is still checked against a dummy hash, so the response takes the same time either way and doesn't reveal which accounts exist.
3. A wrong email and a wrong password get the same message.
4. On success the server returns a **15-minute access token**. The browser keeps it in memory only, never in localStorage where any script could read it.
5. The server also sets a **7-day refresh token** in an `httpOnly`, `SameSite=Strict` cookie that JavaScript can't read.
6. When the access token expires, the app quietly exchanges the cookie for a new one. After a page reload, it restores the session the same way.

**What happens when you sign out.** The user's `tokenVersion` is incremented, which invalidates every refresh token issued before. The cookie is cleared.

**What happens when data is displayed**
- Every API response masks personal data: `R••• S•••••`, `r•••@example.com`, `••/••/1996`, `••••••3210`.
- The full values are only available from `POST /api/me/reveal`. That endpoint:
  - asks for the password again
  - sends `Cache-Control: no-store`
  - writes a `PII_REVEAL` audit entry.
- The date of birth stored on each illustration is encrypted the same way.

**Other protections**
- Login, register and reveal are rate-limited to 10 attempts per 15 minutes per IP address.
- `helmet` sets the security headers.
- Token checks pin the signing algorithm (HS256), the issuer and the audience, so a refresh token can't be used as an access token.
- The request logger replaces passwords, personal fields, the `Authorization` header and cookies with `[REDACTED]`. Encrypting the database would be pointless if the logs held the plain text.
- Internal errors return a generic 500 message with no stack trace.

**Why not simply hash the personal data?** Hashing is one-way, and the app must show customers their own details. Encryption with a key kept outside the database is the right tool.

---

## 10. Secrets and environment management

**In the repository**
- `packages/api/.env.example` lists every variable, with a comment and a generation command for each. It is committed.
- `packages/api/.env` holds the real values. It is gitignored and never committed.
- The web app holds no secrets. Anything in a Vite `VITE_` variable ends up in the public JavaScript bundle.

**Checked at startup.** `packages/api/src/config/env.ts` validates the whole environment before the server listens. The server refuses to start if:
- any required variable is missing
- a JWT secret is shorter than 32 characters
- the access and refresh secrets are the same
- an encryption key isn't exactly 32 bytes
- the active key version has no matching key.

Error messages name the variable but never print its value.

**From development to production**

| Stage | Where secrets live |
| --- | --- |
| Local development | `.env`, gitignored, values generated with `openssl rand` |
| CI | The CI provider's secret store (for example GitHub Actions secrets), injected as environment variables, never written in workflow files |
| Production | A secrets manager (AWS Secrets Manager, HashiCorp Vault or Azure Key Vault), injected at deploy time, with separate values for each environment |
| Encryption keys | A key management service with envelope encryption: the master key never leaves the KMS, and the app only holds data keys in memory |

**Rotating the encryption key, step by step**
1. Add a new key: `PII_ENCRYPTION_KEYS=1:<old>,2:<new>`.
2. Set `PII_ACTIVE_KEY_VERSION=2` and redeploy. New writes use key 2, and old rows still decrypt with key 1.
3. Run a background job that re-encrypts rows still on key 1. `cipher.needsRotation()` identifies them.
4. When no key-1 rows remain, remove key 1.

The tests cover this sequence.

---

## 11. Scaling to millions of inputs

**The key property.** The engine is a pure function: it reads no database, clock or environment, and no illustration depends on any other. That means the work can be split into any number of pieces and run in parallel with no coordination, no shared state and no locks.

**Why not simply call the API a million times?** One huge synchronous request would time out, run out of database connections, and fill memory with results. One bad row would fail the whole batch, with no way to resume. Bulk work needs its own pipeline:

```
upload CSV ─► object storage ─► split into chunks ─► queue (one message per chunk)
                                                          │
             ┌────────────────────────┬──────────────────┤
             ▼                        ▼                  ▼
         worker 1                 worker 2    ...    worker N    (stateless, scaled on queue depth)
             │                        │                  │
             └──────► results per chunk to object storage, or COPY into Postgres
                                      │
                       job status and download link for the client
```

**The pipeline, step by step**
1. **Upload.** The client uploads the CSV to object storage (for example S3) and immediately gets a job id.
2. **Stream.** The file is read line by line, never loaded whole, so memory stays flat whatever the file size.
3. **Chunk.** Lines are grouped into chunks of 5,000–10,000. A chunk is the unit of work and of retry, so one bad chunk costs one chunk, not the whole run.
4. **Queue.** One message per chunk goes onto a queue (SQS, RabbitMQ, or BullMQ on Redis).
5. **Process.** Stateless workers load the catalogue once, then run the same five rules and the same engine as the API on each row. Invalid rows are reported with their reasons, and the run carries on. More throughput means more workers.
6. **Write in bulk.** Results go to files in object storage, or into Postgres with `COPY`, which is usually 10–100× faster than row-by-row inserts.
7. **Make it resumable.** Each chunk's status (pending, done or failed) is tracked, and its output is keyed by a hash of its inputs and the rate version, so a re-run overwrites rather than duplicates.
8. **Deliver.** The client polls the job status or receives a webhook, then downloads a file. It never gets a JSON array of a million objects.

**This runs today on a single machine.** `packages/api/src/bulk/runBulk.ts` implements steps 2, 3, 5 and 6. A pool of worker threads (one per CPU core) stands in for the queue, and backpressure stops it reading while every worker is busy.

```bash
npm run bulk:sample -w packages/api -- 1000000 bulk-input.csv   # generate test data (~5% invalid on purpose)
npm run bulk -- bulk-input.csv bulk-output.csv --workers 11 --chunk 5000
```

Measured on a 12-core laptop:

```
10,00,000 rows in 9.8s (1,01,556 rows/s) with 11 workers, 200 chunks of 5000.
OK 949539, invalid 50461, errors 0.
```

The same run completes with each worker's memory capped at 48 MB, which shows memory depends on the chunk size, not the file size. The calculation itself is cheap, so at scale the limit is I/O. That's why the design streams its input, batches its output, and keeps the engine free of I/O. Moving to many machines replaces the thread pool with a real queue; the worker code stays the same.

**Input CSV format**

```
id,policyTypeCode,dob,gender,sumAssured,policyTerm,premiumTerm,frequency,riderCodes
1,ENDOWMENT,1996-01-15,MALE,1000000,20,10,ANNUAL,ADB|CI
```

Output columns: `id, status (OK / INVALID / ERROR), entryAge, modalPremium, annualisedPremium, totalPremiumPaid, maturityBenefit, rateVersion, errors`.

---

## 12. API reference

Every route except `/api/auth/*` and `/api/health` needs an `Authorization: Bearer <access token>` header.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create an account (PII encrypted) and start a session |
| POST | `/api/auth/login` | Sign in and start a session |
| POST | `/api/auth/refresh` | Exchange the refresh cookie for a new access token |
| POST | `/api/auth/logout` | Revoke refresh tokens and clear the cookie |
| GET | `/api/me` | Your masked profile |
| POST | `/api/me/reveal` | Your unmasked profile (password required, audited) |
| GET | `/api/policy-types` | Plans with their limits, riders, premium options and table columns |
| GET | `/api/policy-types/:code` | One plan |
| POST | `/api/illustrations/preview` | Validate and calculate without saving |
| POST | `/api/illustrations` | Validate, calculate and save |
| GET | `/api/illustrations` | Your saved illustrations (summary) |
| GET | `/api/illustrations/:id` | One illustration, regenerated from its saved inputs |

**Every error uses the same format:**

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more inputs are invalid",
    "details": [
      { "field": "premiumTerm", "code": "PREMIUM_TERM_RANGE",
        "message": "Premium paying term must be at least 5 years and cannot exceed the policy term" }
    ]
  }
}
```

The form places each `details` entry directly under the matching field.

---

## 13. Tests

Run everything with `npm test`: 58 core tests and 43 API tests.

| Area | What is tested |
| --- | --- |
| Validation | Both sides of every limit for all five rules (for example, exactly 18 passes and one day short of 18 fails), all failures reported together, and the frequency and rider checks |
| Age | Birthday today and tomorrow, year boundaries, 29 February in leap and non-leap years, impossible dates |
| Engine | The worked example above checked row by row, female rating, riders with monthly payments, rounding to paise, float drift, a missing rate, determinism |
| Encryption | Round trip, fresh IV on each encryption, tamper detection, a value moved to another column, wrong key, key rotation |
| Configuration | Every required secret, weak secrets, secrets never printed in errors, the timezone-safe "today" |
| API | Missing, forged and wrong-type tokens, the error format, PII absent from responses, malformed JSON, no leaked internals, security headers |

---

## 14. Known gaps and next steps

- **Calculation rules.** The five validations, the formulas and the rates are stand-ins until the assignment spreadsheet can be opened (section 7).
- **Bulk upload over HTTP.** The bulk runner is a command-line tool. The upload, job and status endpoints plus a real queue are the next step.
- **Refresh token reuse detection.** Logout revokes all of a user's refresh tokens, but a stolen refresh token stays valid until logout or expiry. The next step is to store refresh token IDs and treat any reuse as theft.
- **Integration tests against a real database.** The API tests use an in-memory catalogue. A Testcontainers suite would cover the database paths.
- **Frontend tests.**
- **Email enumeration at registration.** A duplicate email returns 409, which reveals that the account exists. A production system would email the existing account holder instead.

---

## 15. Troubleshooting

| Problem | Fix |
| --- | --- |
| `No workspaces found` | Run npm commands from the project root, and check the root `package.json` has `"workspaces": ["packages/*"]` |
| API exits with `Invalid environment configuration` | The message names the variable. Check `packages/api/.env` against `.env.example`. |
| `Can't reach database server` | Start Docker Desktop, then run `npm run db:up`. The database is on port **5433**. |
| `bcrypt` or Prisma errors after install | `npm install-scripts approve bcrypt prisma @prisma/engines esbuild && npm rebuild` |
| Web app says it can't reach the server | Make sure the API is running on port 4000. `npm run dev` starts both. |
| Port 5173 is in use | Another Vite server is running. Stop it, or use the port Vite prints. |
