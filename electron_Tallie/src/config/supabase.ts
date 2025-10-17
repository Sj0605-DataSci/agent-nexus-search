// Configuration loaded from environment variables via webpack
export const getSupabaseConfig = () => {
    // Hardcoding as of now as not accepting from env
  const supabaseUrl = 'https://mtxrobrwanikajymnkaf.supabase.co';
  const supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10eHJvYnJ3YW5pa2FqeW1ua2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MjYyMjgsImV4cCI6MjA2ODUwMjIyOH0.DRsvTVe7d_fpu32sAmYDbZhMvJM6zaYOuq_l5TKnvDg';

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '⚠️ Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.',
    );
  }

  return { supabaseUrl, supabaseKey };
};
