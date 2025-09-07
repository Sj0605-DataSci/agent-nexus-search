-- Create function to execute dynamic SQL queries on connections table
-- This function returns JSONB to avoid type mismatch issues

CREATE OR REPLACE FUNCTION execute_connections_search(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json JSONB;
BEGIN
    -- Execute the dynamic query and convert result to JSONB
    EXECUTE format('
        SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb)
        FROM (%s) t
    ', query_text) INTO result_json;
    
    RETURN result_json;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty array on error
        RETURN '[]'::jsonb;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_connections_search(TEXT) TO authenticated;
