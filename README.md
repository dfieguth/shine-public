# Shine Dance Studio — Public Website

The parent-facing site for Shine Dance Studio, a free dance ministry of Granada Heights Friends Church, La Mirada, CA: the homepage, live class schedule, registration, policies, and recital ticket reservations.

It shares one Supabase database with the **shine-admin** staff tool. Everything Corrie edits in the admin shows up here without a code change.

## What reads from the database

- **Schedule and registration class list:** the `classes` table (active classes only).
- **Homepage wording, registration switches and meeting details:** Admin → Site Content.
- **Team, testimonials, announcements, policies, photos:** their own admin screens.
- **Recital tickets (`/tickets`):** Admin → Recital Tickets.

There is no built-in fallback content. If the database cannot be reached, each section shows a loading or "could not load" message, and the forms tell people to email Corrie. Nothing made-up is ever shown.

## How the forms save (important)

The public is **not** allowed to write families, students, enrollments, registrations or ticket reservations directly. Two database functions do that work, and each one runs every check itself, one request at a time:

- `register_student()` — class registration (migration 43).
- `reserve_tickets()` — recital tickets (migrations 39 and 42).

That is what stops a class or a show being overfilled when many families submit at once, and it means the browser is never trusted. The interest and volunteer forms still save directly, with size limits.

The two email functions in `netlify/functions` are public endpoints, so they take only an id from the browser and read who to email, and what to say, from the database.

## Setup

1. `npm install`
2. Copy `env.example` to `.env` and fill in the same Supabase URL and anon key as shine-admin.
3. `npm run dev`

The database itself is built from the **shine-admin** repo (`schema.sql`, then the migrations). See that README.

## Deploying to Netlify

- Push to GitHub and import the repo in Netlify.
- Under Site configuration → Environment variables, add:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` (if the app password is ever regenerated, update it on BOTH Netlify sites at the same time)
  - `NOTIFY_EMAIL` (where new-registration alerts go)
  - `ALLOWED_ORIGIN` (optional: the site's own address)
- **Never** add `SUPABASE_SERVICE_ROLE_KEY` to this site. It is a master password for the database and belongs only on shine-admin.
- Vite bakes the `VITE_` variables in at build time, so trigger a fresh deploy after changing one.

## Facts baked into the code

These are not editable from the admin. Changing them needs a code edit:

- Contact: Corrie Villa, shineGHFC@gmail.com (shown on the forms and used as the email signature)
- Church: 11818 La Mirada Blvd., La Mirada, CA 90638
- The donation link (`REGISTRATION_DONATION_URL` in `src/App.jsx`)
