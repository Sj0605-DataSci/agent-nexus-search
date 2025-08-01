-- Migration script for existing users to the credit and tier system
-- Run this AFTER applying the main database schema

-- Step 1: Insert default subscription records for all existing users
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
    auto_renew,
    created_at,
    updated_at
)
SELECT 
    p.id as profile_id,
    'free' as tier,  -- Start all existing users on free tier
    50 as credits,   -- Give existing users 50 welcome credits
    50 as total_credits_purchased,  -- Track the welcome credits
    10 as daily_searches_allowed,   -- Free tier daily limit
    0 as daily_searches_used,       -- Reset usage
    CURRENT_DATE as last_search_date,
    2 as deep_searches_allowed,     -- Free tier deep search limit
    0 as deep_searches_used,        -- Reset usage
    10 as basic_searches_allowed,   -- Free tier basic search limit
    0 as basic_searches_used,       -- Reset usage
    p.created_at as subscription_start_date,  -- Use their original signup date
    false as auto_renew,
    p.created_at as created_at,     -- Use their original signup date
    NOW() as updated_at
FROM public.profiles p
WHERE p.id NOT IN (
    SELECT profile_id FROM public.user_subscriptions
);

-- Step 2: Create welcome credit transaction records for existing users
INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits,
    description,
    reference_id,
    created_at
)
SELECT 
    p.id as user_id,
    'purchase' as transaction_type,
    50 as credits,
    'Welcome credits for existing user migration' as description,
    'MIGRATION_' || p.id::text as reference_id,
    NOW() as created_at
FROM public.profiles p
WHERE p.id NOT IN (
    SELECT user_id FROM public.credit_transactions WHERE description LIKE 'Welcome credits for existing user migration'
);

-- Step 3: Analyze existing chat usage to potentially upgrade heavy users
-- This query identifies users who might benefit from a higher tier
-- (You can run this separately to review before applying upgrades)

-- Users with high search activity (more than 50 chats) - consider upgrading to Pro
/*
SELECT 
    p.id,
    p.email,
    p.full_name,
    COUNT(cm.id) as total_chats,
    COUNT(DISTINCT DATE(cm.created_at)) as active_days,
    ROUND(COUNT(cm.id)::decimal / GREATEST(COUNT(DISTINCT DATE(cm.created_at)), 1), 2) as avg_chats_per_day
FROM public.profiles p
LEFT JOIN public.chat_messages cm ON p.id = cm.user_id
WHERE p.created_at < NOW() - INTERVAL '7 days'  -- Users who've been around for at least a week
GROUP BY p.id, p.email, p.full_name
HAVING COUNT(cm.id) > 50  -- More than 50 total chats
ORDER BY total_chats DESC;
*/

-- Step 4: Optional - Upgrade heavy users to Pro tier with bonus credits
-- Uncomment and modify the user IDs below if you want to upgrade specific users

/*
UPDATE public.user_subscriptions 
SET 
    tier = 'pro',
    credits = credits + 200,  -- Bonus credits for upgrade
    total_credits_purchased = total_credits_purchased + 200,
    daily_searches_allowed = 100,
    deep_searches_allowed = 50,
    basic_searches_allowed = 100,
    updated_at = NOW()
WHERE profile_id IN (
    -- Add specific user IDs here
    -- 'user-id-1',
    -- 'user-id-2'
);

-- Add transaction records for the bonus credits
INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits,
    description,
    reference_id,
    created_at
)
SELECT 
    profile_id as user_id,
    'bonus' as transaction_type,
    200 as credits,
    'Pro tier upgrade bonus for existing heavy user' as description,
    'PRO_UPGRADE_' || profile_id::text as reference_id,
    NOW() as created_at
FROM public.user_subscriptions
WHERE tier = 'pro' 
AND profile_id IN (
    -- Same user IDs as above
    -- 'user-id-1',
    -- 'user-id-2'
);
*/

-- Step 5: Verify migration results
SELECT 
    'Migration Summary' as summary,
    COUNT(*) as total_users_migrated,
    SUM(credits) as total_credits_distributed
FROM public.user_subscriptions;

-- Check for any users without subscriptions (should be 0)
SELECT 
    'Users without subscriptions' as check_name,
    COUNT(*) as count
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON p.id = us.profile_id
WHERE us.profile_id IS NULL;

-- Show tier distribution
SELECT 
    tier,
    COUNT(*) as user_count,
    AVG(credits) as avg_credits
FROM public.user_subscriptions
GROUP BY tier
ORDER BY 
    CASE tier 
        WHEN 'free' THEN 1 
        WHEN 'pro' THEN 2 
        WHEN 'enterprise' THEN 3 
    END;
