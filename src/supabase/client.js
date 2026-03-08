import { createClient } from '@supabase/supabase-js'

// อ่านค่าจาก .env ของ Vite (ต้องขึ้นต้นด้วย VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

if (!supabaseUrl || !supabaseAnonKey) {
  // อย่าให้แอปพังทั้งหน้า แต่เตือนใน console แทน
  console.error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }

