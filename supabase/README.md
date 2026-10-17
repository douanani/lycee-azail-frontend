# Lycée Azail — Supabase + Cloudflare R2 backend

## 1. Database
1. Supabase dashboard → SQL Editor → run `migrations/20261011000000_init.sql`.
2. **Authentication → Providers → Email → disable "Allow new users to sign up"** (otherwise anyone can create an account; they'd be inactive without a role, but don't leave it open).
3. Create the first admin: Authentication → Users → *Add user* (email + password, auto-confirm), then in SQL Editor:
   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = 'YOU@EXAMPLE.COM';
   update public.profiles set role='admin', is_active=true where id=(select id from auth.users where email='YOU@EXAMPLE.COM');
   ```
4. Run `seed.sql` (after the admin exists, otherwise legacy Drive resources are skipped; it's idempotent, re-run freely).
   The current academic year is seeded as **2025/2026** like the original; add 2026/2027 and "set current" from the admin UI.

## 2. Cloudflare R2
1. R2 → create bucket (e.g. `lycee-files`), keep it **private**.
2. R2 → Manage API tokens → create token with *Object Read & Write* scoped to that bucket. Keep Access Key ID / Secret.
3. Bucket → Settings → CORS policy:
   ```json
   [{
     "AllowedOrigins": ["https://YOUR-SITE.vercel.app", "http://localhost:3000"],
     "AllowedMethods": ["PUT", "GET"],
     "AllowedHeaders": ["Content-Type"],
     "MaxAgeSeconds": 3600
   }]
   ```
   (R2 requires a payment card on the Cloudflare account even for the free tier.)

## 3. Edge Functions
```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase secrets set \
  R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=lycee-files \
  ALLOWED_ORIGIN=https://YOUR-SITE.vercel.app

supabase functions deploy get-upload-url   --no-verify-jwt
supabase functions deploy get-download-url --no-verify-jwt
supabase functions deploy delete-resource  --no-verify-jwt
supabase functions deploy admin-users      --no-verify-jwt
```
`--no-verify-jwt` is intentional: every function verifies the caller itself (`_shared/auth.ts`), and `get-download-url` is public by design.
`ALLOWED_ORIGIN` accepts a single origin; for local dev set it to `http://localhost:3000` temporarily.

## 4. React
```bash
npm i @supabase/supabase-js
```
Vercel → Environment Variables (and a local `.env`):
```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon / publishable key>
```
Copy `src/api/` into the project. Pages must be migrated from axios to `services.js` (see mapping below).

| Old (Laravel) | New |
|---|---|
| `r.uploader.name` | `r.uploader_name` |
| `a.author.name` | `a.author_name` |
| `r.file_url` | `downloadResource(r.id)` |
| `data.data` / `meta.last_page` | same shape from `getResources` / `getUsers` |
| token in localStorage | handled by supabase-js session |

## 5. Keepalive
Add repo secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`; the workflow in `.github/workflows/` pings daily so the free project isn't paused.

## Known limitations
- A presigned PUT cannot enforce file size; the 50MB check is only on the declared size.
- `download_count` increments when the link is issued; anyone can inflate it.
- Unpublished resources can't be downloaded through `get-download-url` (even by their owner).
- Deleting a user who owns content fails (FK restrict) → deactivate instead.
- A failed R2 delete leaves an orphan file (logged in function logs).
