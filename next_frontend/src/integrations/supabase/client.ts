// lib/supabase.ts (suggested location)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseConfig } from "@/config/supabase";

const { supabaseUrl, supabaseKey } = getSupabaseConfig();

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create client with cookie fallback options
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use localStorage as fallback when cookies are not available, but only in browser
    storage: {
      getItem: (key) => {
        if (!isBrowser) return null;
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn("Failed to access localStorage:", error);
          return null;
        }
      },
      setItem: (key, value) => {
        if (!isBrowser) return;
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn("Failed to write to localStorage:", error);
        }
      },
      removeItem: (key) => {
        if (!isBrowser) return;
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn("Failed to remove from localStorage:", error);
        }
      }
    }
  },
});
