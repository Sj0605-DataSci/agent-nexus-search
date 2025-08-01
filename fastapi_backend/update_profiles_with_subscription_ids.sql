-- Migration script to update existing profiles with their subscription IDs
-- Run this after adding the user_subscriptions_id column to profiles table

-- Step 1: Add the column if it doesn't exist (run this in Supabase SQL editor first)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_subscriptions_id UUID;

-- Step 2: Add the foreign key constraint if it doesn't exist
-- ALTER TABLE public.profiles 
-- ADD CONSTRAINT profiles_user_subscriptions_id_fkey 
-- FOREIGN KEY (user_subscriptions_id) REFERENCES public.user_subscriptions (id);

-- Step 3: Update existing profiles with their subscription IDs
UPDATE public.profiles 
SET user_subscriptions_id = us.id
FROM public.user_subscriptions us
WHERE profiles.id = us.profile_id 
AND profiles.user_subscriptions_id IS NULL;

-- Step 4: Verify the update
SELECT 
    'Profiles updated with subscription IDs' as status,
    COUNT(*) as profiles_updated
FROM public.profiles 
WHERE user_subscriptions_id IS NOT NULL;

-- Step 5: Check for any profiles without subscription IDs (should be 0)
SELECT 
    'Profiles missing subscription IDs' as status,
    COUNT(*) as profiles_missing_subscription_id
FROM public.profiles 
WHERE user_subscriptions_id IS NULL;

-- Step 6: Verify the relationship integrity
SELECT 
    p.id as profile_id,
    p.email,
    p.user_subscriptions_id,
    us.tier,
    us.credits
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON p.user_subscriptions_id = us.id
WHERE us.id IS NULL
LIMIT 5;  -- Should return no rows if all relationships are correct
