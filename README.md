# La Bitácora

Everyday hostel moments → a live, shareable feed. Staff post in seconds; guests can add their own; flagged moments become your La Mañanera / social content pipeline.

## Stack
Vite + React + React Router + Tailwind + Supabase (DB, Auth, Storage).

## 1. Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor, paste in `supabase/schema.sql`, and run it.
   - This creates all tables, RLS policies, the `moments-media` storage bucket, and seeds **Viajero La Fortuna** with the 7 pillars.
3. Go to **Authentication → Providers** and make sure Email (magic link) is enabled.
4. Add your staff manually for now:
   - Have each staff member sign in once at `/staff/login` with their email (this creates their `auth.users` row).
   - Then in the SQL editor, insert their `staff_users` row, e.g.:
     ```sql
     insert into staff_users (property_id, auth_id, name, role)
     values (
       (select id from properties where slug = 'la-fortuna'),
       (select id from auth.users where email = 'jay@viajerohostels.com'),
       'Jay Kennedy',
       'manager'
     );
     ```
5. (Optional but recommended) In **Storage → moments-media → Settings**, set a file size limit (e.g. 15MB) to match the client-side cap.

## 2. Local dev

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase → Settings → API
npm run dev
```

- Public feed: `http://localhost:5173/`
- Guest submit: `http://localhost:5173/submit`
- Staff: `http://localhost:5173/staff/login`

## 3. Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo.
3. Framework preset: Vite (auto-detected).
4. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Every push to `main` redeploys; every branch gets a preview URL — test moderation flow on a preview before merging.

## 4. QR code for guest submission

Once deployed, generate a QR code pointing to `https://your-domain.vercel.app/submit` and put it at check-in / on tables. No login required for guests.

## What's intentionally NOT in this MVP

- No likes/comments/social graph
- No guest accounts
- No AI auto-captions
- No auto-generated newsletter draft (pull flagged moments manually first — automate once you know the pattern)

See the flagged tab in `/staff/moderate` → that's your weekly newsletter/social pull.
