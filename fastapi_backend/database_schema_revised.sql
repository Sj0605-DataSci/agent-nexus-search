-- REVISED DATABASE SCHEMA FOR PRICING/CREDITS SYSTEM
-- Separate table approach for better normalization

-- Keep existing profiles table minimal
-- No changes needed to current profiles table structure

-- New user_subscriptions table to handle all tier/credit data
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  
  -- Tier and Credit System
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  credits integer NOT NULL DEFAULT 10,
  total_credits_purchased integer NOT NULL DEFAULT 0,
  
  -- Daily Search Limits and Tracking
  daily_searches_allowed integer NOT NULL DEFAULT 5,
  daily_searches_used integer NOT NULL DEFAULT 0,
  last_search_date date NULL DEFAULT CURRENT_DATE,
  
  -- Search Type Limits (for different tiers)
  deep_searches_allowed integer NOT NULL DEFAULT 1,
  deep_searches_used integer NOT NULL DEFAULT 0,
  basic_searches_allowed integer NOT NULL DEFAULT 5,
  basic_searches_used integer NOT NULL DEFAULT 0,
  
  -- Subscription Management
  subscription_start_date timestamp with time zone NULL,
  subscription_end_date timestamp with time zone NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT user_subscriptions_profile_id_unique UNIQUE (profile_id)
) TABLESPACE pg_default;

-- Search usage tracking table (unchanged)
CREATE TABLE public.search_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits_used integer NOT NULL DEFAULT 0,
  search_date timestamp with time zone NOT NULL DEFAULT now(),
  thread_id uuid NOT NULL,
  message_id uuid NOT NULL,
  success boolean NOT NULL DEFAULT true,
  error_message text NULL,
  
  CONSTRAINT search_usage_pkey PRIMARY KEY (id),
  CONSTRAINT search_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT search_usage_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads (id) ON DELETE CASCADE,
  CONSTRAINT search_usage_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Credit transactions table (unchanged)
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')),
  credits integer NOT NULL,
  description text NULL,
  reference_id text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Tier configurations table (unchanged)
CREATE TABLE public.tier_configs (
  tier text NOT NULL PRIMARY KEY,
  daily_basic_searches integer NOT NULL,
  daily_deep_searches integer NOT NULL,
  basic_search_credit_cost integer NOT NULL,
  deep_search_credit_cost integer NOT NULL,
  monthly_price_usd decimal(10,2) NULL,
  features jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
) TABLESPACE pg_default;

-- Insert default tier configurations
INSERT INTO public.tier_configs (tier, daily_basic_searches, daily_deep_searches, basic_search_credit_cost, deep_search_credit_cost, monthly_price_usd, features) VALUES
('free', 5, 1, 1, 3, 0.00, '{"email_reports": false, "api_access": false, "priority_support": false}'),
('pro', 50, 10, 1, 3, 29.99, '{"email_reports": true, "api_access": true, "priority_support": false}'),
('enterprise', 500, 100, 1, 3, 99.99, '{"email_reports": true, "api_access": true, "priority_support": true, "custom_integrations": true}');

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
    subscription_id UUID;
BEGIN
    -- Insert default subscription and capture the ID
    INSERT INTO public.user_subscriptions (
        profile_id,
        tier,
        credits,
        total_credits_purchased,
        daily_searches_allowed,
        daily_searches_used,
        last_search_date,
        deep_searches_allowed,
        deep_searches_used,
        basic_searches_allowed,
        basic_searches_used,
        subscription_start_date,
        auto_renew
    ) VALUES (
        NEW.id,
        'free',
        50,  -- Welcome credits
        50,  -- Track welcome credits as purchased
        10,  -- Free tier daily limit
        0,   -- Reset usage
        CURRENT_DATE,
        2,   -- Free tier deep search limit
        0,   -- Reset usage
        10,  -- Free tier basic search limit
        0,   -- Reset usage
        NOW(),
        false
    ) RETURNING id INTO subscription_id;
    
    -- Update the profile with the subscription ID
    UPDATE public.profiles 
    SET user_subscriptions_id = subscription_id
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create subscription when profile is created
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- Function to reset daily search counters
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions 
  SET 
    daily_searches_used = 0,
    basic_searches_used = 0,
    deep_searches_used = 0,
    last_search_date = CURRENT_DATE
  WHERE last_search_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user_subscriptions updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON public.user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_profile_id ON public.user_subscriptions (profile_id);
CREATE INDEX idx_user_subscriptions_tier ON public.user_subscriptions (tier);
CREATE INDEX idx_user_subscriptions_last_search_date ON public.user_subscriptions (last_search_date);
CREATE INDEX idx_search_usage_user_id_date ON public.search_usage (user_id, search_date);
CREATE INDEX idx_credit_transactions_user_id_date ON public.credit_transactions (user_id, created_at);

-- Enable pg_cron extension (run this first if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reset (requires pg_cron extension)
SELECT cron.schedule('reset-daily-searches', '0 0 * * *', 'SELECT reset_daily_searches();');
