-- Improved Credit System Logic
-- This addresses the credit tracking issue for different tier types

-- Updated user_subscriptions table structure with better credit tracking
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS allocated_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchased_credits INTEGER NOT NULL DEFAULT 0;

-- Update the credit logic comments
COMMENT ON COLUMN public.user_subscriptions.credits IS 'Current available credits (allocated + purchased - used)';
COMMENT ON COLUMN public.user_subscriptions.allocated_credits IS 'Credits allocated by tier (reset daily/monthly)';
COMMENT ON COLUMN public.user_subscriptions.purchased_credits IS 'Credits purchased by user (never reset)';
COMMENT ON COLUMN public.user_subscriptions.total_credits_purchased IS 'Total credits ever purchased (audit trail)';

-- Credit System Logic:
-- 1. Hunter Tier: Gets 5 allocated_credits daily (free)
-- 2. Pro Tier: Gets 1000 allocated_credits monthly (paid)
-- 3. Enterprise/Community: Unlimited (no deduction)
-- 4. Users can also buy additional purchased_credits
-- 5. credits = allocated_credits + purchased_credits (current available)

-- Update existing Hunter tier users with proper credit allocation
UPDATE public.user_subscriptions 
SET 
    allocated_credits = 5,
    purchased_credits = 0,
    credits = 5, -- allocated_credits + purchased_credits
    total_credits_purchased = 0 -- Hunter tier users haven't purchased anything
WHERE tier = 'Hunter';

-- Updated credit reset function with better logic
CREATE OR REPLACE FUNCTION reset_user_credits()
RETURNS void AS $$
BEGIN
    -- Reset daily allocated credits for Hunter tier
    UPDATE public.user_subscriptions 
    SET 
        allocated_credits = 5, -- Reset daily allocation
        credits = 5 + purchased_credits, -- allocated + purchased
        last_credit_reset = CURRENT_DATE,
        updated_at = NOW()
    WHERE 
        tier = 'Hunter' 
        AND credit_reset_period = 'daily'
        AND (last_credit_reset < CURRENT_DATE OR last_credit_reset IS NULL);
    
    -- Reset monthly allocated credits for Pro tier
    UPDATE public.user_subscriptions 
    SET 
        allocated_credits = 1000, -- Reset monthly allocation
        credits = 1000 + purchased_credits, -- allocated + purchased
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
        allocated_credits = 999999,
        purchased_credits = 0, -- Unlimited users don't need purchased credits
        credits = 999999,
        updated_at = NOW()
    WHERE 
        is_unlimited = true 
        AND credits < 999999;
    
    RAISE NOTICE 'Credit reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Updated credit consumption logic
CREATE OR REPLACE FUNCTION consume_credits(
    user_profile_id UUID,
    credits_to_consume INTEGER
) RETURNS TABLE(
    success BOOLEAN,
    remaining_credits INTEGER,
    allocated_remaining INTEGER,
    purchased_remaining INTEGER
) AS $$
DECLARE
    current_allocated INTEGER;
    current_purchased INTEGER;
    current_total INTEGER;
BEGIN
    -- Get current credit breakdown
    SELECT allocated_credits, purchased_credits, credits
    INTO current_allocated, current_purchased, current_total
    FROM public.user_subscriptions
    WHERE profile_id = user_profile_id;
    
    -- Check if user has enough credits
    IF current_total < credits_to_consume THEN
        RETURN QUERY SELECT false, current_total, current_allocated, current_purchased;
        RETURN;
    END IF;
    
    -- Consume credits (prioritize allocated credits first, then purchased)
    IF current_allocated >= credits_to_consume THEN
        -- Consume from allocated credits only
        UPDATE public.user_subscriptions
        SET 
            allocated_credits = allocated_credits - credits_to_consume,
            credits = credits - credits_to_consume,
            updated_at = NOW()
        WHERE profile_id = user_profile_id;
        
        RETURN QUERY SELECT 
            true, 
            current_total - credits_to_consume,
            current_allocated - credits_to_consume,
            current_purchased;
    ELSE
        -- Consume all allocated credits, then from purchased
        DECLARE
            remaining_to_consume INTEGER := credits_to_consume - current_allocated;
        BEGIN
            UPDATE public.user_subscriptions
            SET 
                allocated_credits = 0,
                purchased_credits = purchased_credits - remaining_to_consume,
                credits = credits - credits_to_consume,
                updated_at = NOW()
            WHERE profile_id = user_profile_id;
            
            RETURN QUERY SELECT 
                true,
                current_total - credits_to_consume,
                0,
                current_purchased - remaining_to_consume;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add purchased credits
CREATE OR REPLACE FUNCTION add_purchased_credits(
    user_profile_id UUID,
    credits_to_add INTEGER,
    purchase_description TEXT DEFAULT 'Credit purchase'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Add to purchased credits and total credits
    UPDATE public.user_subscriptions
    SET 
        purchased_credits = purchased_credits + credits_to_add,
        credits = credits + credits_to_add,
        total_credits_purchased = total_credits_purchased + credits_to_add,
        updated_at = NOW()
    WHERE profile_id = user_profile_id;
    
    -- Record the transaction
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        credits,
        description,
        created_at
    ) VALUES (
        user_profile_id,
        'purchase',
        credits_to_add,
        purchase_description,
        NOW()
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Verification: Show the improved credit structure
SELECT 
    p.email,
    us.tier,
    us.allocated_credits,
    us.purchased_credits,
    us.credits as total_available_credits,
    us.total_credits_purchased,
    us.credit_reset_period
FROM public.profiles p
JOIN public.user_subscriptions us ON p.id = us.profile_id
ORDER BY us.tier, p.email
LIMIT 10;
