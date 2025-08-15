import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/config/supabase";

const { supabaseUrl, supabaseKey: supabaseAnonKey } = getSupabaseConfig();

export const supabaseTemp = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
