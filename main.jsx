import { createClient } from '@supabase/supabase-js'

// Same Supabase project as the Shine admin tool. Set in .env:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
// If these are missing, the site still renders using the built-in
// fallback schedule, and the form shows a note instead of saving.

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
