-- Migration: Create Pure Credit-Only System
-- This creates all tables from scratch with a pure credit-based system
-- No daily search limits - only credit consumption

-- 1. Create Tier enum type
CREATE TYPE public.tier_type AS ENUM ('Hunter', 'Pro', 'Enterprise', 'Community');

-- 2. Create tier_configs table (credit-only system)
CREATE TABLE public.tier_configs (
    "Tier" public.tier_type NOT NULL,
    basic_search_credit_cost INTEGER NOT NULL DEFAULT 1,
    deep_search_credit_cost INTEGER NOT NULL DEFAULT 3,
    monthly_price_usd NUMERIC(10, 2) NULL,
    features JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT tier_configs_pkey PRIMARY KEY ("Tier")
) TABLESPACE pg_default;

-- 3. Insert tier configurations (credit-only)
INSERT INTO public.tier_configs ("Tier", basic_search_credit_cost, deep_search_credit_cost, monthly_price_usd, features) VALUES
('Hunter', 1, 3, 0.00, '{"daily_credit_allocation": 5, "description": "Hunter tier with 5 credits per day", "reset_period": "daily"}'),
('Pro', 1, 3, 25.99, '{"monthly_credit_allocation": 1000, "description": "Pro tier with 1000 credits per month", "reset_period": "monthly"}'),
('Enterprise', 1, 3, 99.99, '{"unlimited_credits": true, "description": "Enterprise tier with unlimited credits", "reset_period": "unlimited"}'),
('Community', 1, 3, 99.99, '{"unlimited_credits": true, "description": "Community tier with unlimited credits", "reset_period": "unlimited"}');

-- 4. Create user_subscriptions table (credit-only system)
CREATE TABLE public.user_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    tier public.tier_type NOT NULL DEFAULT 'Hunter',
    credits INTEGER NOT NULL DEFAULT 5,
    total_credits_purchased INTEGER NOT NULL DEFAULT 0,
    credit_reset_period TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'monthly', 'unlimited'
    last_credit_reset DATE NULL DEFAULT CURRENT_DATE,
    monthly_credits_allocated INTEGER NOT NULL DEFAULT 5,
    is_unlimited BOOLEAN NOT NULL DEFAULT false,
    subscription_start_date TIMESTAMP WITH TIME ZONE NULL,
    subscription_end_date TIMESTAMP WITH TIME ZONE NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT user_subscriptions_profile_id_unique UNIQUE (profile_id),
    CONSTRAINT user_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT user_subscriptions_tier_fkey FOREIGN KEY (tier) REFERENCES tier_configs ("Tier")
) TABLESPACE pg_default;

-- 5. Create search_usage table
CREATE TABLE public.search_usage (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    credits_used INTEGER NOT NULL DEFAULT 0,
    search_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    thread_id UUID NULL,
    message_id UUID NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT NULL,
    search_mode TEXT NOT NULL DEFAULT 'basic',
    CONSTRAINT search_usage_pkey PRIMARY KEY (id),
    CONSTRAINT search_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT search_usage_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES chat_threads (id) ON DELETE CASCADE,
    CONSTRAINT search_usage_message_id_fkey FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE,
    CONSTRAINT search_usage_search_mode_check CHECK (search_mode = ANY (ARRAY['basic'::text, 'deep'::text]))
) TABLESPACE pg_default;

-- 6. Create credit_transactions table
CREATE TABLE public.credit_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
    credits INTEGER NOT NULL,
    description TEXT NULL,
    reference_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
    CONSTRAINT credit_transactions_type_check CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'usage'::text, 'refund'::text, 'bonus'::text]))
) TABLESPACE pg_default;

-- 7. Create indexes for performance
CREATE INDEX idx_user_subscriptions_profile_id ON public.user_subscriptions(profile_id);
CREATE INDEX idx_user_subscriptions_tier ON public.user_subscriptions(tier);
CREATE INDEX idx_user_subscriptions_credit_reset_period ON public.user_subscriptions(credit_reset_period);
CREATE INDEX idx_user_subscriptions_last_credit_reset ON public.user_subscriptions(last_credit_reset);
CREATE INDEX idx_user_subscriptions_is_unlimited ON public.user_subscriptions(is_unlimited);
CREATE INDEX idx_search_usage_user_id_date ON public.search_usage(user_id, search_date);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);

-- 8. Create function to reset credits based on tier
CREATE OR REPLACE FUNCTION reset_user_credits()
RETURNS void AS $$
BEGIN
    -- Reset daily credits for hunter tier
    UPDATE public.user_subscriptions 
    SET 
        credits = monthly_credits_allocated,
        last_credit_reset = CURRENT_DATE,
        updated_at = NOW()
    WHERE 
        tier = 'Hunter' 
        AND credit_reset_period = 'daily'
        AND (last_credit_reset < CURRENT_DATE OR last_credit_reset IS NULL);
    
    -- Reset monthly credits for pro tier (first day of month)
    UPDATE public.user_subscriptions 
    SET 
        credits = monthly_credits_allocated,
        last_credit_reset = CURRENT_DATE,
        updated_at = NOW()
    WHERE 
        tier = 'Pro' 
        AND credit_reset_period = 'monthly'
        AND (
            last_credit_reset < DATE_TRUNC('month', CURRENT_DATE)
            OR last_credit_reset IS NULL
        );
    
    -- Ensure unlimited tiers always have max credits
    UPDATE public.user_subscriptions 
    SET 
        credits = 999999,
        updated_at = NOW()
    WHERE 
        is_unlimited = true 
        AND credits < 999999;
    
    -- Log the reset operation
    RAISE NOTICE 'Credit reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger function for automatic subscription creation
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_subscriptions (
        profile_id,
        tier,
        credits,
        credit_reset_period,
        monthly_credits_allocated,
        is_unlimited
    ) VALUES (
        NEW.id,
        'Hunter',
        5,
        'daily',
        5,
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-create subscription for new users
CREATE TRIGGER create_subscription_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- 11. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create updated_at triggers
CREATE TRIGGER update_tier_configs_updated_at
    BEFORE UPDATE ON public.tier_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 13. Setup cron job for credit resets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove any existing credit-related cron jobs (ignore errors if they don't exist)
        BEGIN
            PERFORM cron.unschedule('reset-daily-searches');
            RAISE NOTICE 'Removed existing reset-daily-searches job';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Job reset-daily-searches not found, skipping unschedule';
        END;
        
        BEGIN
            PERFORM cron.unschedule('reset-user-credits');
            RAISE NOTICE 'Removed existing reset-user-credits job';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Job reset-user-credits not found, skipping unschedule';
        END;
        
        -- Check if the job already exists before creating it
        IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-user-credits') THEN
            -- Schedule new credit reset job (runs daily at midnight)
            PERFORM cron.schedule('reset-user-credits', '0 0 * * *', 'SELECT reset_user_credits();');
            RAISE NOTICE 'Credit reset cron job scheduled successfully';
        ELSE
            RAISE NOTICE 'Credit reset cron job already exists';
        END IF;
    ELSE
        RAISE NOTICE 'pg_cron extension not available - credit resets must be handled manually';
    END IF;
END $$;

-- 14. Add helpful comments
COMMENT ON TABLE public.tier_configs IS 'Credit-only tier configurations';
COMMENT ON TABLE public.user_subscriptions IS 'User subscription data with credit-only system';
COMMENT ON TABLE public.search_usage IS 'Search usage tracking with credit consumption';
COMMENT ON TABLE public.credit_transactions IS 'Credit transaction history for auditing';

COMMENT ON COLUMN public.user_subscriptions.credit_reset_period IS 'Period for credit reset: daily, monthly, or unlimited';
COMMENT ON COLUMN public.user_subscriptions.last_credit_reset IS 'Last date when credits were reset';
COMMENT ON COLUMN public.user_subscriptions.monthly_credits_allocated IS 'Number of credits allocated per reset period';
COMMENT ON COLUMN public.user_subscriptions.is_unlimited IS 'Whether user has unlimited credits';

-- 15. Verification query
SELECT 'Credit-only system created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tier_configs', 'user_subscriptions', 'search_usage', 'credit_transactions')
ORDER BY table_name;
