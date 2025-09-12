/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please import from '@/integrations/supabase/client' instead.
 * 
 * This file re-exports the unified Supabase client to prevent
 * multiple GoTrueClient instances in the same browser context.
 */

import { supabase, supabaseHandler as originalSupabaseHandler } from "@/integrations/supabase/client";

// Re-export the unified client with the same name for backward compatibility
export const supabaseHandler = originalSupabaseHandler;

// Log a warning in development to encourage migration to the new import path
if (process.env.NODE_ENV === "development") {
  console.warn(
    "Warning: You are importing from '@/app/supabaseClient' which is deprecated. " +
    "Please update your imports to use '@/integrations/supabase/client' instead."
  );
}
