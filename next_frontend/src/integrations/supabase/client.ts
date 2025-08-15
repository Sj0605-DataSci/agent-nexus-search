// lib/supabase.ts (suggested location)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseConfig } from "@/config/supabase";

const { supabaseUrl, supabaseKey } = getSupabaseConfig();

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
