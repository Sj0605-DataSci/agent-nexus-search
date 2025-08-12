-- Drop Credit System Tables with CASCADE
-- This will remove all tables and handle foreign key constraints properly

-- Drop tables in reverse dependency order to avoid constraint issues
-- CASCADE will handle any remaining foreign key references

-- 1. Drop search_usage table (has foreign keys to other tables)
DROP TABLE IF EXISTS public.search_usage CASCADE;

-- 2. Drop credit_transactions table 
DROP TABLE IF EXISTS public.credit_transactions CASCADE;

-- 3. Drop user_subscriptions table (referenced by profiles table)
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- 4. Drop tier_configs table
DROP TABLE IF EXISTS public.tier_configs CASCADE;

-- 5. Remove any cron jobs related to credit system
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Try to unschedule existing cron jobs (ignore errors if they don't exist)
        BEGIN
            PERFORM cron.unschedule('reset-daily-searches');
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore error if job doesn't exist
        END;
        
        BEGIN
            PERFORM cron.unschedule('reset-user-credits');
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore error if job doesn't exist
        END;
    END IF;
END $$;

-- 6. Drop any functions related to credit system
DROP FUNCTION IF EXISTS public.reset_daily_searches() CASCADE;
DROP FUNCTION IF EXISTS public.reset_user_credits() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_subscription() CASCADE;

-- 7. Drop any triggers related to subscriptions
DROP TRIGGER IF EXISTS create_subscription_trigger ON public.profiles;

-- 8. Clean up any foreign key columns in profiles table that reference user_subscriptions
-- This will set the user_subscriptions_id column to NULL if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_subscriptions_id'
        AND table_schema = 'public'
    ) THEN
        -- Remove the foreign key constraint first
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_subscriptions_id_fkey;
        
        -- Set all values to NULL
        UPDATE public.profiles SET user_subscriptions_id = NULL;
        
        -- Optionally drop the column entirely (uncomment if you want to remove it)
        -- ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_subscriptions_id;
    END IF;
END $$;

-- 9. Drop any custom types/enums related to tiers if they exist
DROP TYPE IF EXISTS public.tier CASCADE;
DROP TYPE IF EXISTS public.Tier CASCADE;

-- Verification: List remaining tables to confirm cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tier_configs', 'user_subscriptions', 'search_usage', 'credit_transactions')
ORDER BY table_name;
