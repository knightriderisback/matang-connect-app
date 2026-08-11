# Matang Connect

Digital ecosystem for the Matang community.  
**Stage 1 – Foundation: 100% Complete**

Pilot: Bilaspur, Chhattisgarh  
Stack: Next.js 14 + TypeScript + Tailwind + Supabase + Vercel

## Stage 1 Features (Complete)

- Secure M-PIN Auth (server-side RPC, hash never leaves DB)
- Rate limiting (5 failed attempts → 15 min lock)
- Smart Family Census (multi-step wizard)
- Digital ID + QR Code
- Manual Verification (Admin)
- City Directory with filters
- Welcome Animation (first login after verification)
- Multi-language: English / हिंदी / मराठी / छत्तीसगढ़ी
- Number localization (display only)
- Role-based middleware (normal / volunteer / core_committee / super_admin)
- Feature flags architecture
- Audit log foundation
- PWA ready

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   APP_SESSION_SECRET=<openssl rand -base64 32>
   ```
3. Run the SQL in `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
4. `npm run dev`

## Deploy

```bash
vercel --prod
```

Or connect the GitHub repo to Vercel and set the 4 environment variables.

## Stage 2 (Complete)

- Notices (priority + WhatsApp share)
- Jobs & Livelihood board
- Care requests (medical / elderly / disability)
- Kosh transparency ledger
- City Titles assignment
- Audit log viewer
- Feature flags / app settings

## Stage 3 (Complete)

- **Vyapar** – Business directory (shop / service / food / manufacturing)
- **Matrimony** – Community match profiles
- **Dharohar** – Heritage, culture, history posts
- **Panchang** – Festivals & important dates
- **Mahila Shakti** – Women empowerment resources / events / schemes
- **Polls** – Community polls with live vote counts

Run migrations in order:
1. `supabase/migrations/20260811_stage1_complete.sql`
2. `supabase/migrations/20260811_stage2_core.sql`
3. `supabase/migrations/20260811_stage3_modules.sql`
