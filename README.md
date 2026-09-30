# Benefit Illustration Module

A full-stack web app that shows what a life insurance policy pays back, year by year. A customer registers, picks a plan, enters the policyholder's details, premium and sum assured, and sees the total benefit and IRR update live. They can then save a full benefit illustration: a year-by-year table and chart of premiums, bonuses, the total benefit and net cash flows.

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, React Router, React Hook Form |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 through Prisma 7 |
| Validation | Zod: one set of schemas, shared by the browser and the server |
| Money | decimal.js: exact decimal arithmetic, never JavaScript floats |
| Auth and security | bcrypt, JWT, AES-256-GCM field encryption, helmet, rate limiting |
| Tests | Vitest and Supertest (109 tests) |

> **About the calculation rules.** The five input validations, the bonus schedule and the illustration columns come from the assignment's Inputs and Illustrations sheets, and the engine reproduces the sheet's example to the rupee (IRR 8.4%). The sheet has three quirks, and section 6 says how each is handled: the total benefit includes bonuses for years after the policy term, the example's premium breaks its own premium limit, and the sum assured rule is worded ambiguously.

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
16. [Deployment](#16-deployment)

---

## 1. What the app does

| Screen | Route | Purpose |
| --- | --- | --- |
| Login / Register | `/login` | Create an account or sign in |
| New illustration (Policy Calculation) | `/calculate` | Choose a plan, enter details, see the benefit and IRR live, generate an illustration |
| Illustration | `/illustration/:id` | Summary figures, a benefit chart, and the year-by-year table |
| Saved illustrations | `/history` | Every saved illustration, filterable by plan, each expandable to show its premium, cover and IRR |
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
│  │  │  ├─ types/          PolicyType, PremiumOption, RateTable, Product
│  │  │  ├─ calc/           age.ts, money.ts, irr.ts, illustration.ts (the engine)
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
3. `prisma db seed` loads the plan from the spreadsheet, with its premium options and bonus schedule.

**Step 4: Run the app**

```bash
npm run dev
```

This starts the API on http://localhost:4000 and the web app on http://localhost:5173. The web app forwards `/api` requests to the API, so the browser only ever talks to one address.

**Step 5: Open http://localhost:5173 and register an account.**

**Other commands**

| Command | What it does |
| --- | --- |
| `npm test` | Runs all 109 unit and API tests |
| `npm run typecheck` | Type-checks all packages and builds the web app |
| `npm run bulk -- in.csv out.csv` | Runs the bulk illustration runner (see section 11) |
| `npm run db:down` | Stops the database container |

---

## 4. Using the app, step by step

**Step 1: Register.** Enter your full name, email, date of birth, mobile number and a password. Validation runs as you leave each field. When you submit, your personal details are encrypted before they reach the database (section 9), and you're signed in straight away.

**Step 2: Choose a plan.** The calculation page shows each plan as a card with its limits: entry age, policy term and premium range. Open **Plan details** on the right to see all the limits.

**Step 3: Enter the policyholder's details.**
- **Date of birth.** The form immediately shows the age at last birthday.
- **Gender.**
- **Payment frequency:** yearly, half-yearly or monthly.
- **Premium** per instalment, with the yearly total shown for half-yearly and monthly payments.
- **Sum assured.** Shown back in words ("12 lakh") so zeros are easy to check, with the minimum allowed for the premium entered.
- **Policy term and premium paying term**, each with its allowed range underneath.

**Step 4: Read the live result.** As soon as every input passes the rules, the panel on the right shows the total benefit, the premium, total premiums, total bonus and the IRR. It recalculates 350 ms after you stop typing, and nothing is saved at this stage. If an input breaks a rule, the field turns red and shows which rule.

**Step 5: Generate the illustration.** Click **Generate illustration**. The server validates and calculates again, saves the illustration, and opens the Illustration page.

**Step 6: Read the illustration.**
- **Summary cards:** sum assured, premium, total premiums, and the total benefit with its IRR and how many times the premiums it pays back.
- **Chart:** premiums paid and bonus accrued for each policy year, with the total benefit marked in the policy term year. Hover over it to see every value for a year.
- **Table:** the spreadsheet's columns for every year of the bonus schedule, explained in section 6. A dashed line marks the year premiums stop, and the policy term year is highlighted.
- **Print** produces a clean printed copy.

**Step 7: Review saved illustrations.** **Saved illustrations** lists everything you've generated, with tabs for each plan. Click a row to expand it and see its sum assured, premium, total benefit and IRR.

**Step 8: View your profile.** Your details are shown masked (`R••• S•••••`, `••••••3210`). To see them in full, re-enter your password. Each reveal is recorded in the audit log.

---

## 5. How a calculation flows through the system

These are the steps between typing a value and seeing a number:

1. **The browser checks the input.** React Hook Form runs the same Zod schema the server uses (`createIllustrationSchema` from `core`), built for the selected plan and today's date. Errors appear under the field that caused them.
2. **The browser asks for a preview.** Once the inputs pass, the page waits 350 ms for typing to stop, then sends `POST /api/illustrations/preview`. The request carries the access token in its `Authorization` header.
3. **The server authenticates.** The `requireAuth` middleware checks the JWT's signature, issuer, audience and expiry.
4. **The server validates again.** The client can't be trusted, so the API validates the field types first, then loads the plan from the catalogue and runs the five rules. Any failure returns HTTP 400 with every problem listed against its field.
5. **The server fixes the valuation date.** "Today" is taken in the `Asia/Kolkata` timezone, so a server running in UTC can't get a customer's age wrong on their birthday.
6. **The engine calculates.** `generateIllustration(input, plan, rates, today)` runs entirely in memory and returns the premium, one row per year of the bonus schedule, and a summary with the IRR.
7. **The server sends the result.** Every money value goes out as a string with two decimal places (`"80000.00"`), because JSON numbers are floats and could lose paise. Rates go out as exact fractions: bonus rates as given (`"0.025"`), the IRR to six places (`"0.084150"`).
8. **Saving is a separate request.** `POST /api/illustrations` repeats steps 3–7, then stores the **inputs**, the valuation date and the rate-table version. It doesn't store the output rows.
9. **Reopening regenerates the illustration.** `GET /api/illustrations/:id` decrypts the stored date of birth, loads the rate table by its saved version, and runs the engine again with the saved valuation date. The same inputs, date and rates always produce the same numbers, so the rows never need to be stored.

---

## 6. The calculation, step by step

The engine is in `packages/core/src/calc/illustration.ts` and reproduces the Illustrations sheet.

**Inputs** (from the Inputs sheet): date of birth, gender, sum assured, modal premium, premium frequency, policy term (PT) and premium paying term (PPT).

**Step 1: Age.** Age is taken at the last completed birthday on the valuation date. Someone born on 29 February has their birthday on 1 March in non-leap years, so on 28 February 2025 a person born on 29 February 2000 is 24.

**Step 2: Annual premium**

```
annual premium = modal premium × instalments per year      (yearly 1, half-yearly 2, monthly 12)
```

**Step 3: One row per year of the bonus schedule, t = 1 to 20**

| Column | Formula |
| --- | --- |
| Policy Year | t |
| Premium | the annual premium while t ≤ PPT; after that 0 |
| Sum Assured | the sum assured in year PT only; otherwise 0 |
| Bonus Rate | that year's rate from the bonus schedule (the plan's rate table) |
| Bonus Amount | sum assured × bonus rate |
| Total Benefit | in year PT only: sum assured + the bonus amount of **every** year in the schedule; otherwise 0 |
| Net Cashflows | total benefit − premium |

**Step 4: IRR.** The internal rate of return of the net cash flows, with year 1 at time 0, as the spreadsheet's `IRR()` does. It is solved in `packages/core/src/calc/irr.ts`: a float estimate first, then Newton's method in exact decimals, with bisection as a fallback. If the cash flows never change sign there is no IRR, and it is shown as "–".

The bonus schedule, in policy-year order: 2.5%, 3%, 3.5%, 3.5%, 3.5%, 3.5%, 3%, 3%, 3%, 3%, 3%, 2.5%, 3%, 3%, 2.5%, 5%, 4%, 4.5%, 4%, 25%.

**Worked example.** This is the sheet's own example, checked row by row in `packages/core/tests/illustration.test.ts`.

Inputs: male born 12 December 1999, sum assured ₹12,00,000, premium ₹80,000 yearly, PT 18, PPT 10.

| Step | Value |
| --- | --- |
| Premium, years 1–10 | ₹80,000 a year, ₹8,00,000 in total |
| Bonus, year 1 | ₹12,00,000 × 2.5% = ₹30,000 |
| Bonus, all 20 years | ₹10,56,000 |
| Total benefit, year 18 | ₹12,00,000 + ₹10,56,000 = **₹22,56,000** |
| IRR | **8.415%**, shown in the sheet as 8.4% |

**How the spreadsheet's quirks are handled**
- **Bonuses after the policy term.** The sheet adds the bonuses of all 20 years to the year-18 payout, including years 19 and 20, which fall after an 18-year policy ends (year 20 alone is 25%). The engine does the same so the figures match. Counting only years 1 to PT would give ₹19,08,000 and an IRR of 7.04% for the example. The rule is one line in `generateIllustration` if the business wants it changed.
- **The example fails validation.** Its ₹80,000 premium is above the ₹50,000 maximum in rule 1, so the app rejects it. The engine still produces it when called directly, which is how the test checks it.
- **The sum assured rule** reads "Minimum of 10 times Sum assured or 5000000". It is taken to mean the sum assured must be at least the lower of 10 × the annual premium and ₹50,00,000 (section 7).

**Money rules**
- Every calculation uses `decimal.js`. JavaScript floats can't represent paise exactly: adding ₹1,990.63 twelve times in floats gives 23887.56000000001.
- Values are never rounded between steps, only when they are displayed.
- A bonus schedule shorter than the policy term throws `RateNotFoundError`. It never falls back to zero, because a silently wrong illustration is the worst possible failure here.

---

## 7. The five input validations

The rules are in `packages/core/src/validation/illustrationInput.ts`, in the `ILLUSTRATION_RULES` list. They are the five rules on the Inputs sheet. Rule 1 sets three ranges, so it is three checks, and each check records which sheet rule it implements (`sheetRule`). Every limit comes from the plan's data, and every limit is inclusive.

| Sheet rule | Check | Field it reports on | Limit |
| --- | --- | --- | --- |
| 1 | `PREMIUM_TERM_RANGE` | Premium paying term | 5 to 10 years |
| 1 | `POLICY_TERM_RANGE` | Policy term | 10 to 20 years |
| 1 | `PREMIUM_RANGE` | Premium | ₹10,000 to ₹50,000 per instalment |
| 2 | `TERM_ORDER` | Policy term | Policy term longer than the premium paying term |
| 3 | `FREQUENCY` | Premium frequency | Yearly, half-yearly or monthly |
| 4 | `SUM_ASSURED_MIN` | Sum assured | At least the lower of 10 × annual premium and ₹50,00,000 |
| 5 | `ENTRY_AGE` | Date of birth | 23 to 56 years |

**Choices where the sheet is open to reading**
- The premium limit applies to each instalment, as entered. A monthly premium of ₹10,000 passes, even though it is ₹1,20,000 a year.
- Rule 4 uses the annual premium: ₹30,000 half-yearly needs a sum assured of at least ₹6,00,000.

A frequency outside the three is rejected by the input schema before the rules run. All failures are reported together, each against its field.

**Changing the rules.** Limits are data, so changing one means editing `packages/core/src/data/sampleProducts.ts` and running `npm run db:seed`. A new kind of rule is a new entry in `ILLUSTRATION_RULES`, which the browser, API and bulk runner all pick up.

---

## 8. Data model

The data model is in `packages/api/prisma/schema.prisma`.

| Table | What it holds |
| --- | --- |
| `User` | The email as an HMAC hash (for login lookup) and as ciphertext. The bcrypt password hash. The name, DOB and mobile as ciphertext. The first initial and the last 4 digits of the mobile, for display. `tokenVersion`, which logout increments. |
| `PolicyType` | A plan and its limits: entry age, policy term, premium paying term, premium, and the sum assured multiple and cap |
| `PremiumOption` | A payment frequency for a plan and its instalments per year |
| `RateTable` | The versioned bonus schedule, stored as JSON: one bonus rate per policy year. Only one version is active per plan. |
| `Illustration` | A saved illustration's inputs, including the premium (with the DOB encrypted), its valuation date, its rate version, and summary figures for the list view: total premium, total benefit and IRR |
| `AuditLog` | Security events: register, login, failed login, logout, PII reveal, illustration create. IP addresses are stored as hashes. |

**Design decisions**
- **Money is `Decimal(15,2)`** in the database, never a float.
- **Rates are data, not code.** A new bonus schedule is a new row with a new version, so bonus changes need no deployment.
- **Only inputs are stored, not output rows.** A 20-year illustration is one row instead of twenty. At millions of illustrations, that is the difference between millions of rows and tens of millions. The rate version and valuation date make every saved illustration exactly reproducible.
- **Rate JSON is validated on load.** A malformed rate table fails loudly rather than producing a wrong illustration.

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
10,00,000 rows in 9.1s (1,10,480 rows/s) with 11 workers, 200 chunks of 5000.
OK 931778, invalid 68222, errors 0.
```

The same run completes with each worker's memory capped at 48 MB, which shows memory depends on the chunk size, not the file size. The calculation itself is cheap, so at scale the limit is I/O. That's why the design streams its input, batches its output, and keeps the engine free of I/O. Moving to many machines replaces the thread pool with a real queue; the worker code stays the same.

**Input CSV format**

```
id,policyTypeCode,dob,gender,sumAssured,modalPremium,policyTerm,premiumTerm,frequency
1,ENDOWMENT,1999-12-12,MALE,1200000,40000,18,10,ANNUAL
```

Output columns: `id, status (OK / INVALID / ERROR), entryAge, modalPremium, annualisedPremium, totalPremiumPaid, maturityBenefit, irr, rateVersion, errors`. `maturityBenefit` is the total benefit.

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
| GET | `/api/policy-types` | Plans with their limits, premium options and table columns |
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
      { "field": "modalPremium", "code": "PREMIUM_RANGE",
        "message": "Premium must be between ₹10,000 and ₹50,000" }
    ]
  }
}
```

The form places each `details` entry directly under the matching field.

---

## 13. Tests

Run everything with `npm test`: 64 core tests and 45 API tests.

| Area | What is tested |
| --- | --- |
| Validation | Both sides of every limit in all five sheet rules (for example, exactly 23 passes and one day short of 23 fails), the sum assured cap for each frequency, the sheet's own example failing on its premium, and all failures reported together |
| Age | Birthday today and tomorrow, year boundaries, 29 February in leap and non-leap years, impossible dates |
| Engine | The sheet's example checked against all 20 rows and its 8.4% IRR, half-yearly and monthly premiums, the payout year following the policy term, IRR edge cases, a short bonus schedule, determinism |
| Encryption | Round trip, fresh IV on each encryption, tamper detection, a value moved to another column, wrong key, key rotation |
| Configuration | Every required secret, weak secrets, secrets never printed in errors, the timezone-safe "today" |
| API | Missing, forged and wrong-type tokens, the error format, PII absent from responses, malformed JSON, no leaked internals, security headers |

---

## 14. Known gaps and next steps

- **Spreadsheet quirks.** The total benefit counts bonuses for years after the policy term, to match the sheet. Confirm this with the business (section 6).
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
| `Can't reach database server`, or login and register fail with `ECONNREFUSED` in the API log | Start Docker Desktop, then run `npm run db:up`. The database is on port **5433**. |
| `bcrypt` or Prisma errors after install | `npm install-scripts approve bcrypt prisma @prisma/engines esbuild && npm rebuild` |
| Web app says it can't reach the server | Make sure the API is running on port 4000. `npm run dev` starts both. |
| Port 5173 is in use | Another Vite server is running. Stop it, or use the port Vite prints. |

---

## 16. Deployment

The app runs entirely on free tiers:

| Part | Platform | Config in the repo |
| --- | --- | --- |
| Database | Render PostgreSQL (free for 30 days; Neon is a permanent free alternative) | — |
| API | Render web service (free; sleeps after ~15 minutes idle) | `render.yaml` |
| Frontend | Vercel (free) | `vercel.json`, `.vercelignore` |

```
browser ──► Vercel (React app)
               │  /api/* rewritten to Render
               ▼
           Render web service (Express API) ──► Render PostgreSQL
```

The browser only ever talks to the Vercel domain. Vercel forwards `/api/*` to Render. This keeps the refresh cookie (`SameSite=Strict`) on the same site, so sessions survive a page reload. Because requests pass through two proxies (Vercel, then Render's load balancer), the API runs with `TRUST_PROXY=2` so rate limiting sees the real visitor's IP.

**Step by step**
1. **Database.** Create a Render PostgreSQL database. From your machine, apply the schema and load the sample plans. External Render URLs need `?sslmode=verify-full`.
   ```bash
   cd packages/api
   DATABASE_URL="<external url>?sslmode=verify-full" npx prisma migrate deploy
   DATABASE_URL="<external url>?sslmode=verify-full" npm run db:seed
   ```
2. **API.** In Render, choose **New → Blueprint** and select this repository. Render reads `render.yaml`, generates every secret itself, and asks for two values:
   - `DATABASE_URL`: the database's **Internal** Database URL
   - `WEB_ORIGIN`: the Vercel URL, for example `https://assesment.vercel.app`

   Each deploy runs `prisma migrate deploy` before starting the server. The `sheet_calculation` migration deletes illustrations and plans saved under the old placeholder model, so run `npm run db:seed` against the database once after deploying it. Check `https://<service>.onrender.com/api/health` afterwards.
3. **Frontend.** Import the repository in Vercel, or run `vercel --prod` from the project root. `vercel.json` sets the install, build and output settings and the `/api` rewrite. If Render gives the API a different URL than `benefit-illustration-api.onrender.com`, update the rewrite destination in `vercel.json`.

**After deploying.** The first request after the API has slept takes about 50 seconds. A free uptime monitor pinging `/api/health` every 10 minutes keeps it awake.

