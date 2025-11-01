import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../config/supabase";

const { supabaseUrl, supabaseKey } = getSupabaseConfig();

// Create a safe storage implementation for Electron
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
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove storage item ${key}:`, error);
      }
    },
  };
};

// Create Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: createSafeStorage(),
  },
});
