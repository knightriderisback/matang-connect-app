# Matang Connect

Digital ecosystem for the Matang community.  
**Stage 1 + 2 + 3 complete** (gap fixes included)

Pilot: Bilaspur, Chhattisgarh  
Stack: Next.js 14 · TypeScript · Tailwind · Supabase · Vercel · PWA

## Features

### Stage 1
- M-PIN auth (RPC, hash never leaves DB) + rate limit lock
- Smart Family Census (DOB, photo, blood group, multi-member)
- Digital ID + QR (+ public `/u/MATANG-…` card)
- Admin verify, directory, reset M-PIN
- Onboarding + welcome animation
- i18n: English / हिंदी / मराठी / छत्तीसगढ़ी
- PWA (icons, standalone)

### Stage 2
- Notices, Jobs, Care, Kosh, City Titles, Audit, Feature flags

### Stage 3
- Vyapar, Matrimony, Dharohar, Panchang, Mahila Shakti, Polls, Arthik Vikas
- QR member lookup (`/scan`)

## Supabase migrations (run in order)

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/20260811_stage1_complete.sql
supabase/migrations/20260811_stage2_core.sql
supabase/migrations/20260811_stage3_modules.sql
supabase/migrations/20260811_stage3_complete.sql
supabase/migrations/20260811_schema_gap_fixes.sql
```

## Setup

1. `npm install`
2. `.env.example` → `.env.local` (Supabase URL, anon, service role, `APP_SESSION_SECRET`)
3. Run migrations above in Supabase SQL Editor
4. `npm run dev`

## Deploy

```bash
git push origin main
```

Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET`.
