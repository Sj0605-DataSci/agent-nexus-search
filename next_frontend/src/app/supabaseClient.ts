import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/config/supabase";

const { supabaseUrl, supabaseKey: supabaseAnonKey } = getSupabaseConfig();

const isBrowser = typeof window !== "undefined";

const createSafeStorage = () => {
  return {
    getItem: (key: string) => {
      try {
        if (isBrowser) {
          return localStorage.getItem(key);
        }
        return null;
      } catch (error) {
        console.warn(`Storage access error for ${key}:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        if (isBrowser) {
          localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn(`Failed to set storage item ${key}:`, error);
      }
    },
    removeItem: (key: string) => {
      try {
        if (isBrowser) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Failed to remove storage item ${key}:`, error);
      }
    },
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
