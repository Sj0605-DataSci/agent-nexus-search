const isProduction = process.env.NODE_ENV === "production";

export const getSupabaseConfig = () => {
  const supabaseUrl = isProduction
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey = isProduction
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_STAGING_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Validate environment variables
  if (!supabaseUrl || !supabaseKey) {
    const missingVars = [];
    if (!supabaseUrl) {
      missingVars.push(
        isProduction ? "NEXT_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_STAGING_URL"
      );
    }
    if (!supabaseKey) {
      missingVars.push(
        isProduction
          ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
          : "NEXT_PUBLIC_SUPABASE_STAGING_PUBLISHABLE_KEY"
      );
    }
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }

  return { supabaseUrl, supabaseKey };
};
