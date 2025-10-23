// Configuration loaded from environment variables via webpack
export const getSupabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Use staging Supabase for both dev and production builds
  // To use production Supabase, set SUPABASE_URL and SUPABASE_ANON_KEY in .env
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_STAGING_URL ||
    'https://mtxrobrwanikajymnkaf.supabase.co';

  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_STAGING_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10eHJvYnJ3YW5pa2FqeW1ua2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MjYyMjgsImV4cCI6MjA2ODUwMjIyOH0.DRsvTVe7d_fpu32sAmYDbZhMvJM6zaYOuq_l5TKnvDg';

  if (!supabaseUrl || !supabaseKey) {
    const error = `Supabase credentials not found`;
    console.error('⚠️', error);
    throw new Error(error);
  }

  console.log(
    `🔧 Using ${isProduction ? 'PRODUCTION' : 'STAGING'} Supabase:`,
    supabaseUrl,
  );

  return { supabaseUrl, supabaseKey };
};
