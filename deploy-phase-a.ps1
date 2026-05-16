# Pipely Phase A + Rebrand one-click deploy
# Right-click in File Explorer -> Run with PowerShell

$ErrorActionPreference = "Stop"
$PROJ = "C:\Users\DELL\Documents\Claude\Projects\WP Theme & Plugins\oneplace-ai-crm"
$DBURL = "postgresql://neondb_owner:npg_koDj08fWrawZ@ep-rough-lab-aov936cx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Pipely - Phase A Deploy + Rebrand" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git push
Write-Host "[1/3] Pushing code to GitHub..." -ForegroundColor Yellow
Set-Location $PROJ
git add -A
git commit -m "feat: Pipely rebrand + Phase A (licenses, super admin, email automation)"
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed. Check your GitHub credentials." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  Code pushed to GitHub." -ForegroundColor Green
Write-Host ""

# 2. DB schema push
Write-Host "[2/3] Migrating Neon database schema..." -ForegroundColor Yellow
Set-Location "$PROJ\packages\db"
$env:DATABASE_URL = $DBURL
npx -y prisma@5.18.0 db push --skip-generate
if ($LASTEXITCODE -ne 0) { Write-Host "DB push failed" -ForegroundColor Red; Read-Host; exit 1 }
npx -y prisma@5.18.0 generate
Write-Host ""

# 3. Re-seed (upgrades admin role + adds sample licenses + welcome email template)
Write-Host "[3/3] Running seed (SUPER_ADMIN role upgrade + sample licenses)..." -ForegroundColor Yellow
npx -y tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { Write-Host "Seed failed" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host ""

Write-Host "=================================================" -ForegroundColor Green
Write-Host " ALL DONE - One more click needed:" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Open https://dashboard.render.com/web/srv-d83arv77f7vs738v5mdg" -ForegroundColor White
Write-Host " Click 'Manual Deploy' -> 'Deploy latest commit'" -ForegroundColor White
Write-Host " Wait ~6 minutes for build" -ForegroundColor White
Write-Host ""
Write-Host " Then visit: https://oneplace-ai-crm.vercel.app" -ForegroundColor Cyan
Write-Host " You'll see the new Pipely branding with indigo theme." -ForegroundColor Cyan
Write-Host " Login: admin@oneplacedigital.com / OnePlace@2026" -ForegroundColor Cyan
Write-Host " Super Admin menu now appears in sidebar." -ForegroundColor Cyan
Write-Host ""
Write-Host " STUDENT SIGNUP CODES (already seeded):" -ForegroundColor Yellow
Write-Host "   ONEPLACE-STUDENT-DEMO  - Starter 90 days, 1000 students" -ForegroundColor White
Write-Host "   ONEPLACE-PRO-1YEAR     - Pro 1 year, single-use" -