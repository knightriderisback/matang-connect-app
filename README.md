# Matang Connect

Digital ecosystem for the Matang community.  
**Stage 1 + 2 + 3: Complete**

Pilot: Bilaspur, Chhattisgarh  
Stack: Next.js 14 + TypeScript + Tailwind + Supabase + Vercel + PWA

## Features

### Stage 1 — Foundation
- Secure M-PIN Auth (server-side RPC, hash never leaves DB)
- Rate limiting (failed attempts → lock)
- Smart Family Census (multi-step wizard, DOB, photo, blood group…)
- Digital ID + QR Code
- Manual Verification (Admin)
- City Directory with filters
- Welcome Animation + Onboarding tutorial
- Multi-language: English / हिंदी / मराठी / छत्तीसगढ़ी
- Role-based middleware (normal / volunteer / core_committee / super_admin)
- Feature flags + Audit logs
- PWA ready (icons, standalone, theme)

### Stage 2 — Community Ops
- Notices (priority + WhatsApp share)
- Jobs & Livelihood board
- Care requests (medical / elderly)
- Kosh transparency ledger
- City Titles (Adhyaksh, Sachiv…)
- Admin: Verify, Reset M-PIN, Audit, Feature Flags

### Stage 3 — Ecosystem
- **Vyapar** — Business directory
- **Matrimony** — Marriage profiles
- **Dharohar** — Heritage & culture
- **Panchang** — Festivals calendar
- **Mahila Shakti** — Women empowerment
- **Polls** — Community voting
- **Arthik Vikas** — Schemes, skills, loans
- **QR Scan** — Lookup member by QR ID / phone

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill keys
3. Run SQL migrations in order in Supabase SQL Editor:
   - `supabase/migrations/20260811_stage1_complete.sql`
   - `supabase/migrations/20260811_stage2_core.sql`
   - `supabase/migrations/20260811_stage3_modules.sql`
   - `supabase/migrations/20260811_stage3_complete.sql`
4. `npm run dev`

## Deploy

```bash
git push origin main
# or: vercel --prod
```

Set env vars on Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET`.
