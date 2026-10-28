// Browser Supabase client. Used for login and, later, file upload/download.
// The anon key is safe in the browser: Row Level Security decides what each user can see.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
