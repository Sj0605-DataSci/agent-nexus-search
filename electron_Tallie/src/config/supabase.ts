// Configuration loaded from environment variables via webpack
export const getSupabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const supabaseUrl = isProduction
    ? process.env.SUPABASE_URL || 'https://wznveojncixcptajnjom.supabase.co'
    : process.env.SUPABASE_STAGING_URL ||
      'https://mtxrobrwanikajymnkaf.supabase.co';

  const supabaseKey = isProduction
    ? process.env.SUPABASE_ANON_KEY || ''
    : process.env.SUPABASE_STAGING_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10eHJvYnJ3YW5pa2FqeW1ua2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MjYyMjgsImV4cCI6MjA2ODUwMjIyOH0.DRsvTVe7d_fpu32sAmYDbZhMvJM6zaYOuq_l5TKnvDg';

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      `⚠️ Supabase credentials not found for ${isProduction ? 'production' : 'staging'}. Please check your .env file.`,
    );
  }

  console.log(
    `🔧 Using ${isProduction ? 'PRODUCTION' : 'STAGING'} Supabase:`,
    supabaseUrl,
  );

  return { supabaseUrl, supabaseKey };
};
