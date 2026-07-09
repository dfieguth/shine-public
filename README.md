# Shine Dance Studio — Public Website

The parent-facing site for Shine Dance Studio, a free dance ministry of Granada Heights Friends Church, La Mirada, CA. Marketing, live class schedule, and registration.

It shares one Supabase database with the shine-admin management tool:
- The schedule section reads live from the `classes` table (active classes only).
- The registration form writes to the `registrations` table, which shows up in the admin tool's Registrations inbox for a leader to process.

## Works with or without the database

If the Supabase environment variables are missing, the site still renders completely using the built-in fallback schedule (the real Shine schedule as of mid-2026). The form will show a friendly note pointing people to Corrie's email instead of saving. This means you can preview and deploy the site before the backend is wired, then connect it later with zero code changes.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the same Supabase URL and anon key used by the shine-admin project. (Skip this to run in fallback mode.)
3. `npm run dev`

## Deploying to Vercel

- Push to a GitHub repo, import in Vercel.
- Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Deploy.

The database's row-level security (from the admin project's `schema.sql`) already allows the public to read active classes and insert registrations, and nothing else. No additional configuration needed.

## Swapping content

- **Hero photo:** replace `src/assets/shine-hero.jpg` with any wide recital/class photo (keep the same filename, or update the import in `App.jsx`). Use release-cleared photos only.
- **Instructor bios/photos:** edit the `TEAM` array near the middle of `src/App.jsx`. Add a `photo` field (import an image at the top) to replace the initials circle.
- **Gallery:** drop images into `src/assets`, import them in `App.jsx`, and add `src` fields to the `GALLERY` array.
- **Schedule:** once Supabase is connected, edit classes in the admin tool and the site updates itself. The `FALLBACK_SCHEDULE` in `App.jsx` only shows when the database is unreachable.

## Facts baked in (verify before launch)

- Contact: Corrie Villa, shineGHFC@gmail.com
- Church: 11818 La Mirada Blvd., La Mirada, CA 90638 · 562.943.7255
- Schedule sourced from ghfc.org/connect/kids
