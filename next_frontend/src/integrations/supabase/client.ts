/**
 * Unified Supabase client for the application
 * This is the single source of truth for Supabase interactions
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseConfig } from "@/config/supabase";

const { supabaseUrl, supabaseKey } = getSupabaseConfig();

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a safe storage implementation that works in both browser and server environments
const createSafeStorage = () => {
  return {
    getItem: (key: string) => {
      if (!isBrowser) return null;
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`Storage access error for ${key}:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      if (!isBrowser) return;
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to set storage item ${key}:`, error);
      }
    },
    removeItem: (key: string) => {
      if (!isBrowser) return;
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove storage item ${key}:`, error);
      }
    },
  };
};

// Create a single Supabase client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: createSafeStorage(),
  },
});

// For backward compatibility with code that uses supabaseHandler
export const supabaseHandler = supabase;
