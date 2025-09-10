import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/config/supabase";

const { supabaseUrl, supabaseKey: supabaseAnonKey } = getSupabaseConfig();

// Create a custom storage handler that gracefully handles permission issues
const createSafeStorage = () => {
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`Storage access error for ${key}:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to set storage item ${key}:`, error);
        // Silently fail when storage access is denied
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove storage item ${key}:`, error);
        // Silently fail when storage access is denied
      }
    }
  };
};

export const supabaseHandler = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: createSafeStorage(),
  },
});
