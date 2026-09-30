import { createClient } from '@supabase/supabase-js'

// Same Supabase project as the Shine admin tool. Set in .env:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
// If these are missing this exports null, and every component checks for
// that before querying — the page still renders, but live content (the
// schedule, photos, team) shows a loading or error state instead, and the
// forms tell people to email Corrie directly rather than silently failing.

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
