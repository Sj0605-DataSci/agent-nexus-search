-- Populate user_subscriptions for all existing profiles
-- This script creates Hunter tier subscriptions for all existing users

-- First, let's check how many profiles exist without subscriptions
SELECT 
    COUNT(*) as total_profiles,
    COUNT(us.id) as profiles_with_subscriptions,
    COUNT(*) - COUNT(us.id) as profiles_without_subscriptions
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON p.id = us.profile_id;

-- Create subscriptions for all profiles that don't have one
INSERT INTO public.user_subscriptions (
    profile_id,
    tier,
    credits,
    total_credits_purchased,
    credit_reset_period,
    last_credit_reset,
    monthly_credits_allocated,
    is_unlimited,
    subscription_start_date,
    subscription_end_date,
    auto_renew,
    created_at,
    updated_at
)
SELECT 
    p.id as profile_id,
    'Hunter'::public.tier_type as tier,
    5 as credits,
    0 as total_credits_purchased,
    'daily' as credit_reset_period,
    CURRENT_DATE as last_credit_reset,
    5 as monthly_credits_allocated,
    false as is_unlimited,
    NOW() as subscription_start_date,
    NULL as subscription_end_date,
    false as auto_renew,
    NOW() as created_at,
    NOW() as updated_at
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON p.id = us.profile_id
WHERE us.id IS NULL; -- Only insert for profiles without existing subscriptions

-- Update the profiles table to link to their new subscriptions
-- This updates the user_subscriptions_id foreign key in profiles table
UPDATE public.profiles 
SET user_subscriptions_id = us.id
FROM public.user_subscriptions us
WHERE profiles.id = us.profile_id 
AND profiles.user_subscriptions_id IS NULL;

-- Verification: Check the results
SELECT 
    'Population completed!' as status,
    COUNT(*) as total_subscriptions_created
FROM public.user_subscriptions;

-- Detailed verification: Show profile and subscription counts by tier
SELECT 
    us.tier,
    COUNT(*) as user_count,
    AVG(us.credits) as avg_credits,
    SUM(us.credits) as total_credits
FROM public.user_subscriptions us
GROUP BY us.tier
ORDER BY us.tier;

-- Show sample of created subscriptions
SELECT 
    p.email,
    p.full_name,
    us.tier,
    us.credits,
    us.credit_reset_period,
    us.created_at
FROM public.profiles p
JOIN public.user_subscriptions us ON p.id = us.profile_id
ORDER BY us.created_at DESC
LIMIT 10;
