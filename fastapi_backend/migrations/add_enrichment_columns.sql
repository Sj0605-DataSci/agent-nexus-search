-- Add enrichment columns to connections table
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS about_section text,
ADD COLUMN IF NOT EXISTS experience_json jsonb,
ADD COLUMN IF NOT EXISTS education_json jsonb,
ADD COLUMN IF NOT EXISTS skills text[],
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS profile_photo_url text,
ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS enrichment_source text,
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamp with time zone;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connections_enriched_at ON public.connections(enriched_at);
CREATE INDEX IF NOT EXISTS idx_connections_enrichment_source ON public.connections(enrichment_source);
CREATE INDEX IF NOT EXISTS idx_connections_linkedin_url ON public.connections(linkedin_url);

-- Add comments for documentation
COMMENT ON COLUMN public.connections.about_section IS 'LinkedIn about/summary section';
COMMENT ON COLUMN public.connections.experience_json IS 'JSON array of work experience entries';
COMMENT ON COLUMN public.connections.education_json IS 'JSON array of education entries';
COMMENT ON COLUMN public.connections.skills IS 'Array of skills from LinkedIn profile';
COMMENT ON COLUMN public.connections.location IS 'Geographic location from LinkedIn profile';
COMMENT ON COLUMN public.connections.profile_photo_url IS 'URL to LinkedIn profile photo';
COMMENT ON COLUMN public.connections.enriched_at IS 'Timestamp when profile was enriched';
COMMENT ON COLUMN public.connections.enrichment_source IS 'Source of enrichment (apify, tavily)';
COMMENT ON COLUMN public.connections.embedding_generated_at IS 'Timestamp when vector embedding was generated';
