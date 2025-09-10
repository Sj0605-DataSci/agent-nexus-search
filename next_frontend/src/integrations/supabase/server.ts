import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/config/supabase";

export const createClient = () => {
  const { supabaseUrl, supabaseKey: supabaseAnonKey } = getSupabaseConfig();
  
  try {
    const cookieStore = cookies();
    
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch (error) {
            console.warn(`Cookie access error for ${name}:`, error);
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn(`Failed to set cookie ${name}:`, error);
            // The `set` method was called from a Server Component or cookie permissions were denied
            // This can be ignored if you have middleware refreshing user sessions
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            console.warn(`Failed to delete cookie ${name}:`, error);
            // The `delete` method was called from a Server Component or cookie permissions were denied
            // This can be ignored if you have middleware refreshing user sessions
          }
        },
      },
    });
  } catch (error) {
    console.error("Failed to initialize Supabase client with cookies:", error);
    
    // Fallback to a client without cookie access
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    });
  }
};
