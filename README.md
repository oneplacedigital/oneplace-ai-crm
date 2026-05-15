# ONEPLACE AI CRM

AI Admissions CRM + Marketing Automation Platform for Digital Marketing Institutes, Coaching Classes, Academies, and Training Centers.

**Built for:** OnePlace Digital Academy, Nashik · **Brand:** `#DB0000` / `#13273B`

---

## What's in this build (Phases 1 → 4)

| Module | Status |
|---|---|
| Multi-tenant Postgres schema (Prisma) | ✅ |
| JWT auth + rotating refresh tokens | ✅ |
| Role-based authorization (5 roles) | ✅ |
| Leads CRUD + filters + pagination | ✅ |
| Pipeline Kanban (drag-and-drop) | ✅ |
| Lead activity timeline + notes | ✅ |
| Counselor dashboard | ✅ |
| Course catalog | ✅ |
| **Meta Lead Ads webhook ingestion (HMAC + replay)** | ✅ |
| **Meta Conversion API (PII-hashed events)** | ✅ |
| **WhatsApp Cloud API sender (templates + text)** | ✅ |
| **WhatsApp inbound webhook → activities** | ✅ |
| **AI lead scoring** | ✅ (set `AI_ENABLED=true`) |
| **AI follow-up suggestions (Hinglish)** | ✅ |
| **AI counselor assistant** | ✅ |
| **AI conversation summaries** | ✅ |
| **Workflow automation engine** | ✅ |
| **Tenant integration management UI** | ✅ |
| **Analytics: funnel / source ROI / leaderboard / time-to-convert** | ✅ |
| At-rest encryption (AES-256-GCM) for tokens | ✅ |
| Audit logging middleware | ✅ |
| Webhook signature verification + replay protection | ✅ |
| Rate-limiting (global + login bruteforce + webhook surge + AI) | ✅ |
| Security playbook (SECURITY.md) | ✅ |

---

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + dnd-kit + SWR + Zustand
- **Backend:** Node.js 20 + Express + TypeScript + Zod + Pino
- **Database:** PostgreSQL 16 + Prisma 5
- **Hosting:** Vercel (web) + Railway/Render (api) + Neon/Supabase (db)
- **Monorepo:** pnpm workspaces + Turborepo

---

## Folder Structure

```
oneplace-ai-crm/
├── apps/
│   ├── api/                  Express REST API + webhooks (:4000)
│   │   └── src/
│   │       ├── config/       env validation, logger (with PII redact)
│   │       ├── lib/          crypto (AES-256-GCM), webhook-security (HMAC + replay)
│   │       ├── middleware/   auth, validate, error, audit
│   │       ├── routes/       auth, leads, users, courses, workflows, ai,
│   │       │                 integrations, analytics, webhooks
│   │       ├── services/     auth, lead, meta, whatsapp, ai, workflow, analytics
│   │       ├── utils/        errors, jwt
│   │       └── validators/   zod schemas
│   └── web/                  Next.js dashboard (:3000)
│       └── src/
│           ├── app/
│           │   ├── (dashboard)/   sidebar layout
│           │   │   ├── dashboard/      KPIs
│           │   │   ├── leads/[id]/     lead detail + AI assistant
│           │   │   ├── pipeline/       drag-drop Kanban
│           │   │   ├── analytics/      funnel + charts
│           │   │   ├── workflows/      automation rules
│           │   │   ├── counselors/     team mgmt
│           │   │   ├── courses/        program catalog
│           │   │   └── integrations/   Meta + WhatsApp setup
│           │   ├── login/
│           │   └── register/
│           ├── components/   Sidebar, StatusBadge, AIAssistant
│           └── lib/          api client, auth store, formatters
├── packages/
│   ├── db/                   Prisma schema + client + seed
│   └── types/                Shared DTOs, enums, pipeline definitions
├── docker-compose.yml        Postgres + Redis
├── SECURITY.md               Security playbook (mandatory reading)
├── README.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Installation

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker Desktop (for local Postgres)

### Steps

```bash
cd oneplace-ai-crm
pnpm install

# Start Postgres + Redis
pnpm docker:up

# Env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# GENERATE SECRETS (critical):
openssl rand -base64 48                              # JWT_SECRET
openssl rand -base64 48                              # JWT_REFRESH_SECRET
openssl rand -base64 32                              # ENCRYPTION_KEY
# Paste into apps/api/.env

# Generate Prisma + push schema + seed
pnpm db:generate
pnpm db:push
pnpm db:seed

# Run dev
pnpm dev
```

Open `http://localhost:3000`.

---

## Default Login (after seed — rotate before production)

| Role | Email | Password |
|---|---|---|
| Tenant Admin | admin@oneplacedigital.com | OnePlace@2026 |
| Counselor | priya@oneplacedigital.com | Counselor@2026 |
| Counselor | rohan@oneplacedigital.com | Counselor@2026 |

---

## Available Scripts

```bash
pnpm dev              # Run all apps via Turbo
pnpm build            # Production build
pnpm typecheck

pnpm db:push          # Push schema (dev)
pnpm db:migrate       # Create migration
pnpm db:studio        # Prisma Studio at :5555
pnpm db:seed

pnpm docker:up
pnpm docker:down
```

---

## API Reference (v1)

Base URL: `http://localhost:4000/api/v1`

### Auth
- `POST /auth/login`
- `POST /auth/register-tenant`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

### Leads
- `GET    /leads?page=&pageSize=&status=&source=&search=&assignedToId=`
- `POST   /leads`
- `GET    /leads/:id`
- `PATCH  /leads/:id`
- `POST   /leads/:id/transition` — `{ status }`
- `POST   /leads/:id/activities` — `{ type, title, body }`
- `DELETE /leads/:id`
- `GET    /leads/pipeline-summary`
- `GET    /leads/counselor-stats`

### Users / Courses / Workflows
- `GET/POST/PATCH /users` (workspace team)
- `GET/POST/PATCH /courses`
- `GET/POST/PATCH/DELETE /workflows`, `GET /workflows/:id/runs`

### AI (rate-limited 60/min/user; requires `AI_ENABLED=true` + `OPENAI_API_KEY`)
- `POST /ai/score` — `{ leadId }` → `{ score, rationale }`
- `POST /ai/suggest-followup` — `{ leadId }` → `{ suggestion }`
- `POST /ai/ask` — `{ leadId, question }` → `{ answer }`
- `POST /ai/summarize` — `{ leadId }` → `{ summary }`

### Integrations (TENANT_ADMIN only)
- `GET /integrations/status` — no tokens, just booleans
- `PUT /integrations/meta` — saves pixelId + access token (encrypted)
- `PUT /integrations/whatsapp` — saves phone-number-id + token (encrypted)
- `POST /integrations/whatsapp/test-template`

### Analytics
- `GET /analytics/funnel`
- `GET /analytics/sources`
- `GET /analytics/daily?days=30`
- `GET /analytics/time-to-convert`
- `GET /analytics/leaderboard`

### Public webhooks (HMAC-verified)
- `GET/POST /webhooks/meta/leads`
- `GET/POST /webhooks/whatsapp`

---

## Multi-tenancy

Every business table carries `tenantId`. Every authenticated request resolves `req.auth.tid` from the JWT and every Prisma query filters by it. The webhook routes resolve tenancy from payload metadata (page-id / phone-number-id) — see `meta.service.ts` / `whatsapp.service.ts`.

Tenant tokens (Meta access token, WhatsApp token) are stored encrypted (AES-256-GCM) and decrypted only inside their service modules.

---

## Meta Conversion API mapping

```
NEW                  → Lead
INTERESTED/CONTACTED → Contact
QUALIFIED            → QualifiedLead
DEMO_SCHEDULED       → Schedule
ADMISSION_CONFIRMED  → Purchase
PAYMENT_COMPLETED    → Purchase
LOST / COLD          → no event
```

Triggered automatically on every status change in `LeadService.update`. PII (`em`, `ph`) is SHA-256 hashed after normalization per Meta spec.

---

## Workflow Engine

Trigger events: `LEAD_CREATED`, `LEAD_STATUS_CHANGED`, `LEAD_ASSIGNED`.

Supported actions:

| Action | Params |
|---|---|
| `SEND_WHATSAPP_TEMPLATE` | `{ templateName, language, variables: ["{{lead.fullName}}"] }` |
| `ASSIGN_COUNSELOR` | `{ userId? }` — defaults to round-robin least-loaded |
| `SET_FOLLOWUP` | `{ hours: 24 }` |
| `SET_STATUS` | `{ status: 'CONTACTED' }` |
| `SEND_META_EVENT` | `{}` — uses current lead status |
| `NOTIFY_COUNSELOR` | `{ message }` |

Variables in strings: `{{lead.fullName}}`, `{{lead.firstName}}`, `{{lead.phone}}`, `{{lead.city}}`.

Default seeded workflows:
1. Welcome new lead via WhatsApp template
2. Fire Meta Purchase event when paid
3. Notify counselor on demo booked

---

## Security

**Read `SECURITY.md` before touching auth, integrations, AI, or webhook code.** Headlines:

- HMAC-SHA256 verification on every webhook with timing-safe compare
- Replay protection via `WebhookEvent` UNIQUE (provider, externalId)
- Raw body capture for HMAC integrity
- PII hashed before Meta CAPI
- Tenant tokens encrypted at rest (AES-256-GCM)
- Login brute-force rate-limit (10/15min/IP)
- AI rate-limit (60/min/user) + prompt-injection delimiters
- Pino logger redacts `passwordHash`, `token`, `authorization`, etc.
- Strict CORS allowlist (no `*`)

---

## Deployment

### Frontend → Vercel

1. Import repo, set **Root Directory** = `apps/web`
2. `vercel.json` configured for pnpm workspaces
3. Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`

### Backend → Railway / Render

Railway:
1. New service from GitHub repo
2. Root = `/`, use `apps/api/Dockerfile`
3. Add Postgres plugin → `DATABASE_URL` auto-injected
4. Set: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGIN`, Meta + WhatsApp envs
5. Healthcheck: `/api/v1/health`
6. Run once via shell: `pnpm db:push && pnpm db:seed`

### DB → Neon or Supabase

1. Create Postgres → copy connection string to `DATABASE_URL`
2. From local: `pnpm db:push && pnpm db:seed`

### Meta webhook setup

1. Facebook App → Webhooks → Subscribe "page" + "leadgen"
2. Callback: `https://YOUR-API/webhooks/meta/leads`
3. Verify token: value of `META_VERIFY_TOKEN`
4. App secret = `META_APP_SECRET` (must match env)

### WhatsApp webhook setup

1. WhatsApp Manager → Configuration → Webhook
2. Callback: `https://YOUR-API/webhooks/whatsapp`
3. Verify token: value of `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to `messages` field
5. Tenant admin saves phone-number-id + permanent access token via `/integrations` UI

---

## Debugging

| Symptom | Fix |
|---|---|
| `prisma generate` fails | Run `pnpm install` from **root** |
| `ENCRYPTION_KEY must decode to 32 bytes` | Regenerate: `openssl rand -base64 32` |
| API 401 on every request | JWT_SECRET mismatch — restart API after env change |
| Webhook returns 403 "Bad signature" | `META_APP_SECRET` mismatch or proxy stripping raw body |
| CORS blocked | Set `CORS_ORIGIN` to exact Vercel URL |
| `relation "tenants" does not exist` | Run `pnpm db:push` |
| AI returns "disabled" | Set `AI_ENABLED=true` and `OPENAI_API_KEY` |
| Workflows don't fire | Check `/workflows` shows `isActive: true` and matching trigger |
| Drag-drop on Kanban silent | Pointer activation distance is 6px — drag farther |

Reset everything:
```bash
pnpm docker:down -v
pnpm docker:up
pnpm db:push
pnpm db:seed
```

---

## License

Proprietary — OnePlace Digital Academy © 2026.
