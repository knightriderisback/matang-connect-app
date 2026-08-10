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

## Stage 2 / 3

Feature-flagged. Schema ready. Implementation on demand.
