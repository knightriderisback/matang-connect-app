# Matang Connect

Digital ecosystem for the Matang community.  
**Stage 1 – Foundation: Complete** · Stage 2 UI/API in progress

Pilot: Bilaspur, Chhattisgarh  
Stack: Next.js 14 + TypeScript + Tailwind + Supabase + Vercel

## Stage 1 Features

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

## Stage 2 (enabled via feature flags)

- Notices, Jobs, Care requests
- City Titles assignment
- Sahyog Kosh (placeholder UI — full module on demand)
- Admin settings / feature flags panel

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   APP_SESSION_SECRET=<openssl rand -base64 32>
   ```
3. Run SQL migrations in Supabase SQL Editor (in order):
   - `supabase/migrations/20260811_stage1_complete.sql`
   - `supabase/migrations/20260811_stage2_core.sql`
   - Plus your base schema (users, cities, families, etc.) if not already applied
4. `npm run dev`

## Deploy

Connect the GitHub repo to Vercel and set the 4 environment variables.  
`APP_SESSION_SECRET` is **required** in production.

```bash
vercel --prod
```

## Notes

- Title options live in `lib/titles.ts` (not inside route files — Next.js App Router restriction).
- Admin nav / Directory quick-action only shows for volunteer+ roles.
