# Phase A Deployment Steps

Phase A adds: **License Keys + Super Admin + Email Automation**

## Step 1: Push code to GitHub

Open PowerShell:

```powershell
cd "C:\Users\DELL\Documents\Claude\Projects\WP Theme & Plugins\oneplace-ai-crm"
git add -A
git commit -m "feat(saas): Phase A - License keys, Super Admin, Email automation"
git push
```

If git asks for credentials, your earlier GitHub auth should still be cached. If not, generate a Personal Access Token at https://github.com/settings/tokens (classic, repo scope), and use it as password.

## Step 2: Trigger Render rebuild

1. Open https://dashboard.render.com/web/srv-d83arv77f7vs738v5mdg
2. Click **Manual Deploy** (top right) → **Deploy latest commit**
3. Wait ~6 minutes for Docker build

## Step 3: Add RESEND_API_KEY (for email sending)

1. Sign up at https://resend.com (free tier: 3000 emails/month)
2. Verify your sending domain (oneplacedigital.com) — they'll show you DNS records to add
3. Go to https://resend.com/api-keys → Create API Key → copy it
4. In Render: https://dashboard.render.com/web/srv-d83arv77f7vs738v5mdg/env
5. Add env var: `RESEND_API_KEY` = the key from step 3
6. Save (will trigger another rebuild)

**If you skip this step:** Email features still work in UI but emails get queued without sending. Users see "FAILED" status with reason "RESEND_API_KEY not configured".

## Step 4: Migrate database schema

The new tables (`license_keys`, `email_templates`, `email_sends`, etc.) need to be created on Neon. Run from PowerShell:

```powershell
cd "C:\Users\DELL\Documents\Claude\Projects\WP Theme & Plugins\oneplace-ai-crm\packages\db"
$env:DATABASE_URL="postgresql://neondb_owner:npg_koDj08fWrawZ@ep-rough-lab-aov936cx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
npx -y prisma@5.18.0 db push --skip-generate
npx -y prisma@5.18.0 generate
npx -y tsx prisma/seed.ts
```

You should see:
```
✓ SUPER_ADMIN: admin@oneplacedigital.com / OnePlace@2026
✓ Sample licenses: 2
✓ Default email template: Welcome Email
```

## Step 5: Verify live

1. Go to https://oneplace-ai-crm.vercel.app
2. Logout if logged in
3. Login as `admin@oneplacedigital.com` / `OnePlace@2026`
4. You should now see **Super Admin** in the sidebar (new red "Platform" section)
5. Click **Super Admin** → you see all tenants + can generate license keys
6. Click **Emails** in sidebar → you see the "Welcome Email" template

## Step 6: Test student signup with license code

Open in incognito: https://oneplace-ai-crm.vercel.app/register?code=ONEPLACE-STUDENT-DEMO

- License field should auto-validate green ("Valid! STARTER plan for 90 days")
- Fill in: Institute Name = "Test Student", Slug = "test-student", Admin = "Test User", Email = "test@example.com", Phone = "+919999999999", Password = "TestStudent2026"
- Click "Create Institute & Start"
- Should redirect to dashboard

Go back to Super Admin tab — you'll see the new tenant in the list.

## What you can now do

### Generate license codes for students
1. Super Admin → License Keys tab → New License Key
2. Set: Name = "May 2026 Cohort", Plan = "STARTER", Valid = 180 days, Max Redemptions = 50
3. Get code like `ONEPLACE-XXXX-YYYY-ZZZZ`
4. Share with students — they enter at /register

### Send transactional emails
1. Emails page → templates tab → use the seeded "Welcome Email" or create new
2. Variables supported: `{{lead.fullName}}`, `{{lead.firstName}}`, `{{lead.email}}`, `{{lead.phone}}`, `{{lead.city}}`
3. Workflow already exists ("Send welcome email to new lead") — triggers automatically on new lead

### Suspend a misbehaving tenant
1. Super Admin → Tenants tab → click "Suspend"
2. Enter reason → tenant's users can no longer log in
3. Click "Activate" to restore

## Troubleshooting

| Symptom | Fix |
|---|---|
| `pnpm db push` fails with "permission denied" | DATABASE_URL has wrong password — copy fresh from Neon console |
| Render build fails on TypeScript errors | Check the build log, usually a missing type. Tell Claude what error |
| Login works but Super Admin link missing | Re-seed (Step 4) — your admin user wasn't migrated to SUPER_ADMIN role |
| Emails show FAILED status | RESEND_API_KEY not set in Render env (Step 3) |
| Student registers but no welcome email | RESEND_API_KEY not set, OR lead has no email address |

## Cost summary

| Service | Free tier limit | Cost above |
|---|---|---|
| Resend | 3000 emails/month, 100/day | $20/mo for 50k emails |
| Render API | 750 hrs/mo (sleeps when idle) | $7/mo Starter (no sleep) |
| Vercel Web | 100 GB bandwidth | $20/mo Pro (rarely needed) |
| Neon DB | 0.5 GB storage | $19/mo Launch (10GB) |

**Phase A keeps you at ₹0/mo** unless you exceed Resend free tier.
