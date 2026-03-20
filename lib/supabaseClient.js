<<<<<<< HEAD
=======
// lib/supabase.js
>>>>>>> d217098d83d14402d8845d61eecd9800e89e593a
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)