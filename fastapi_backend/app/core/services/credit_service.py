"""
Credit and Tier Management Service
Handles all credit operations, tier checks, and subscription management.
"""

from typing import Dict, Any, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
import logging

from app.models.schemas import UserSubscriptionResponse


logger = logging.getLogger(__name__)


class CreditService:
    """Service for handling agent template operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, client=None):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(CreditService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, client=None):
        """Initialize the service with a Supabase client if provided"""
        # Only initialize once
        if not self._initialized and client is not None:
            self.client = client
            self._initialized = True
        # If client is provided and we're already initialized, update the client
        elif client is not None:
            self.client = client
    
    async def check_search_limit(self, user_id: UUID, search_mode: str) -> Dict[str, Any]:
        """
        Check if user can perform a search based on their tier and current usage.
        
        Args:
            user_id: User's profile ID
            search_mode: 'basic' or 'deep'
            
        Returns:
            Dict with can_search, credits_needed, error message, etc.
        """
        try:
            
            # Get user subscription
            subscription_response = await self.client.table("user_subscriptions").select("*").eq("profile_id", str(user_id)).single().execute()
            
            if not subscription_response.data:
                return {
                    "can_search": False,
                    "error": "User subscription not found",
                    "credits_needed": 0,
                    "credits_available": 0
                }
            
            subscription = subscription_response.data
            
            # Reset daily counters if needed
            today = date.today().isoformat()
            if subscription.get("last_search_date") != today:
                await self.client.table("user_subscriptions").update({
                    "daily_searches_used": 0,
                    "basic_searches_used": 0,
                    "deep_searches_used": 0,
                    "last_search_date": today
                }).eq("profile_id", str(user_id)).execute()
                
                # Refresh subscription data
                subscription_response = await self.client.table("user_subscriptions").select("*").eq("profile_id", str(user_id)).single().execute()
                subscription = subscription_response.data
            
            # Get tier configuration
            tier_response = await self.client.table("tier_configs").select("*").eq("tier", subscription["tier"]).single().execute()
            
            if not tier_response.data:
                return {
                    "can_search": False,
                    "error": f"Tier configuration not found for tier: {subscription['tier']}",
                    "credits_needed": 0,
                    "credits_available": subscription["credits"]
                }
            
            tier_config = tier_response.data
            
            # Determine credits needed
            credits_needed = tier_config["basic_search_credit_cost"] if search_mode == "basic" else tier_config["deep_search_credit_cost"]
            
            # Check limits
            can_search = False
            error_message = ""
            
            if search_mode == "basic":
                if subscription["basic_searches_used"] >= tier_config["daily_basic_searches"]:
                    error_message = "Daily basic search limit reached"
                elif subscription["credits"] < credits_needed:
                    error_message = "Insufficient credits"
                else:
                    can_search = True
            else:  # deep search
                if subscription["deep_searches_used"] >= tier_config["daily_deep_searches"]:
                    error_message = "Daily deep search limit reached"
                elif subscription["credits"] < credits_needed:
                    error_message = "Insufficient credits"
                else:
                    can_search = True
            
            return {
                "can_search": can_search,
                "credits_needed": credits_needed,
                "credits_available": subscription["credits"],
                "daily_searches_used": subscription["daily_searches_used"],
                "daily_searches_allowed": subscription["daily_searches_allowed"],
                "basic_searches_used": subscription["basic_searches_used"],
                "deep_searches_used": subscription["deep_searches_used"],
                "tier": subscription["tier"],
                "error": error_message
            }
            
        except Exception as e:
            logger.error(f"Error checking search limits: {str(e)}", exc_info=True)
            return {
                "can_search": False,
                "error": f"Error checking search limits: {str(e)}",
                "credits_needed": 0,
                "credits_available": 0
            }
    
    async def consume_search_credits(
        self, 
        user_id: UUID, 
        search_mode: str,
        thread_id: Optional[str] = None,
        message_id: Optional[str] = None,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Consume credits for a search and update usage counters.
        
        Args:
            user_id: User's profile ID
            search_mode: 'basic' or 'deep'
            thread_id: Chat thread ID
            message_id: Chat message ID
            query: Search query text
            
        Returns:
            Dict with success status, credits_used, remaining_credits
        """
        try:
            
            # Get user subscription and tier config
            subscription_response = await self.client.table("user_subscriptions").select("*").eq("profile_id", str(user_id)).single().execute()
            
            if not subscription_response.data:
                return {"success": False, "error": "User subscription not found"}
            
            subscription = subscription_response.data
            
            # Get tier configuration
            tier_response = await self.client.table("tier_configs").select("*").eq("tier", subscription["tier"]).single().execute()
            tier_config = tier_response.data
            
            # Determine credits to use
            credits_used = tier_config["basic_search_credit_cost"] if search_mode == "basic" else tier_config["deep_search_credit_cost"]
            
            # Update user subscription
            update_data = {
                "credits": subscription["credits"] - credits_used,
                "daily_searches_used": subscription["daily_searches_used"] + 1,
                "updated_at": datetime.now().isoformat()
            }
            
            if search_mode == "basic":
                update_data["basic_searches_used"] = subscription["basic_searches_used"] + 1
            else:
                update_data["deep_searches_used"] = subscription["deep_searches_used"] + 1
            
            await self.client.table("user_subscriptions").update(update_data).eq("profile_id", str(user_id)).execute()
            
            # Record search usage
            search_usage_data = {
                "user_id": str(user_id),
                "credits_used": credits_used,
                "search_date": datetime.now().isoformat(),
                "thread_id": thread_id,
                "message_id": message_id,
                "search_mode": search_mode,
                "success": True,
                "error_message": None
            }
            
            search_usage_response = await self.client.table("search_usage").insert(search_usage_data).execute()
            
            # Record credit transaction
            transaction_data = {
                "user_id": str(user_id),
                "transaction_type": "usage",
                "credits": -credits_used,
                "description": f"{search_mode} search",
                "reference_id": search_usage_response.data[0]["id"] if search_usage_response.data else None,
                "created_at": datetime.now().isoformat()
            }
            
            await self.client.table("credit_transactions").insert(transaction_data).execute()
            
            return {
                "success": True,
                "credits_used": credits_used,
                "remaining_credits": subscription["credits"] - credits_used
            }
            
        except Exception as e:
            logger.error(f"Error consuming credits: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": f"Error consuming credits: {str(e)}",
                "credits_used": 0,
                "remaining_credits": 0
            }
    
    async def get_user_subscription(self, user_id: UUID) -> Optional[UserSubscriptionResponse]:
        """Get user's subscription details."""
        try:
            subscription_response = await self.client.table("user_subscriptions").select("*").eq("profile_id", str(user_id)).single().execute()
            
            if subscription_response.data:
                return UserSubscriptionResponse(**subscription_response.data)
            return None
            
        except Exception as e:
            logger.error(f"Error getting user subscription: {e}", exc_info=True)
            return None
    
    async def get_user_subscription_optimized(self, user_id: UUID) -> Optional[UserSubscriptionResponse]:
        """
        Get user's subscription details using the optimized profile->subscription relationship.
        This method uses the direct foreign key for better performance.
        """
        try:
            # Use the direct relationship from profiles table with explicit relationship name
            profile_response = await self.client.table("profiles").select(
                "user_subscriptions_id, user_subscriptions!profiles_user_subscriptions_id_fkey(*)"
            ).eq("id", str(user_id)).single().execute()
            
            if profile_response.data and profile_response.data.get("user_subscriptions"):
                subscription_data = profile_response.data["user_subscriptions"]
                return UserSubscriptionResponse(**subscription_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting optimized user subscription: {str(e)}", exc_info=True)
            # Fallback to original method
            return await self.get_user_subscription(user_id)

    async def get_user_subscription_with_profile(self, user_id: UUID) -> Dict[str, Any]:
        """
        Get user's subscription details along with profile information in a single query.
        """
        try:
            profile_response = await self.client.table("profiles").select(
                "id, email, full_name, created_at, user_subscriptions_id, user_subscriptions!profiles_user_subscriptions_id_fkey(*)"
            ).eq("id", str(user_id)).single().execute()
            
            if not profile_response.data:
                return {"error": "Profile not found"}
            
            profile_data = profile_response.data
            subscription_data = profile_data.get("user_subscriptions", {})
            
            return {
                "profile": {
                    "id": profile_data["id"],
                    "email": profile_data["email"],
                    "full_name": profile_data["full_name"],
                    "created_at": profile_data["created_at"]
                },
                "subscription": UserSubscriptionResponse(**subscription_data) if subscription_data else None
            }
            
        except Exception as e:
            logger.error(f"Error getting user subscription with profile: {str(e)}", exc_info=True)
            return {"error": f"Error getting user data: {str(e)}"}

    async def add_credits(
        self, 
        user_id: UUID, 
        credits: int, 
        description: str = "Credit purchase",
        reference_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add credits to user's account.
        
        Args:
            user_id: User's profile ID
            credits: Number of credits to add
            description: Transaction description
            reference_id: External reference (payment ID, etc.)
            
        Returns:
            Dict with success status and new credit balance
        """
        try:
            # Get current subscription
            subscription_response = await self.client.table("user_subscriptions").select("*").eq("profile_id", str(user_id)).single().execute()
            
            if not subscription_response.data:
                return {"success": False, "error": "User subscription not found"}
            
            subscription = subscription_response.data
            old_credits = subscription["credits"]
            new_credits = old_credits + credits
            
            # Update user subscription
            await self.client.table("user_subscriptions").update({
                "credits": new_credits,
                "total_credits_purchased": subscription["total_credits_purchased"] + credits,
                "updated_at": datetime.now().isoformat()
            }).eq("profile_id", str(user_id)).execute()
            
            # Record credit transaction
            transaction_data = {
                "user_id": str(user_id),
                "transaction_type": "purchase",
                "credits": credits,
                "description": description,
                "reference_id": reference_id,
                "created_at": datetime.now().isoformat()
            }
            
            await self.client.table("credit_transactions").insert(transaction_data).execute()
            
            return {
                "success": True,
                "credits_added": credits,
                "old_balance": old_credits,
                "new_balance": new_credits
            }
            
        except Exception as e:
            logger.error(f"Error adding credits: {str(e)}", exc_info=True)
            return {"success": False, "error": f"Error adding credits: {str(e)}"}
    
    async def upgrade_tier(
        self, 
        user_id: UUID, 
        new_tier: str,
        subscription_start: Optional[datetime] = None,
        subscription_end: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Upgrade user's tier and adjust limits.
        
        Args:
            user_id: User's profile ID
            new_tier: New tier ('free', 'pro', 'enterprise')
            subscription_start: Subscription start date
            subscription_end: Subscription end date
            
        Returns:
            Dict with success status and new tier info
        """
        try:
            
            # Get tier configuration
            tier_response = await self.client.table("tier_configs").select("*").eq("tier", new_tier).single().execute()
            
            if not tier_response.data:
                return {"success": False, "error": f"Invalid tier: {new_tier}"}
            
            tier_config = tier_response.data
            
            # Get current subscription
            subscription_response = await self.client.table("user_subscriptions").select("*").eq("profile_id", str(user_id)).single().execute()
            
            if not subscription_response.data:
                return {"success": False, "error": "User subscription not found"}
            
            subscription = subscription_response.data
            old_tier = subscription["tier"]
            
            # Update subscription
            update_data = {
                "tier": new_tier,
                "daily_searches_allowed": tier_config["daily_basic_searches"] + tier_config["daily_deep_searches"],
                "basic_searches_allowed": tier_config["daily_basic_searches"],
                "deep_searches_allowed": tier_config["daily_deep_searches"],
                "updated_at": datetime.now().isoformat()
            }
            
            if subscription_start:
                update_data["subscription_start_date"] = subscription_start.isoformat()
            if subscription_end:
                update_data["subscription_end_date"] = subscription_end.isoformat()
            
            await self.client.table("user_subscriptions").update(update_data).eq("profile_id", str(user_id)).execute()
            
            return {
                "success": True,
                "old_tier": old_tier,
                "new_tier": new_tier,
                "new_limits": {
                    "basic_searches": tier_config["daily_basic_searches"],
                    "deep_searches": tier_config["daily_deep_searches"]
                }
            }
            
        except Exception as e:
            logger.error(f"Error upgrading tier: {str(e)}", exc_info=True)
            return {"success": False, "error": f"Error upgrading tier: {str(e)}"}
    
    async def get_usage_stats(self, user_id: UUID, days: int = 30) -> Dict[str, Any]:
        """
        Get user's usage statistics for the past N days.
        
        Args:
            user_id: User's profile ID
            days: Number of days to look back
            
        Returns:
            Dict with usage statistics
        """
        try:            
            # Calculate date range
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Get recent search usage
            usage_response = await self.client.table("search_usage").select("*").eq("user_id", str(user_id)).gte("search_date", start_date).execute()
            recent_usage = usage_response.data or []
            
            # Get recent credit transactions
            transactions_response = await self.client.table("credit_transactions").select("*").eq("user_id", str(user_id)).gte("created_at", start_date).execute()
            recent_transactions = transactions_response.data or []
            
            # Calculate stats
            total_searches = len(recent_usage)
            basic_searches = len([u for u in recent_usage if u.get('search_mode') == 'basic'])
            deep_searches = len([u for u in recent_usage if u.get('search_mode') == 'deep'])
            total_credits_used = sum([u.get('credits_used', 0) for u in recent_usage])
            total_credits_purchased = sum([t.get('credits', 0) for t in recent_transactions if t.get('transaction_type') == 'purchase'])
            
            return {
                "period_days": days,
                "total_searches": total_searches,
                "basic_searches": basic_searches,
                "deep_searches": deep_searches,
                "total_credits_used": total_credits_used,
                "total_credits_purchased": total_credits_purchased,
            }
            
        except Exception as e:
            logger.error(f"Error getting usage stats: {str(e)}", exc_info=True)
            return {"error": f"Error getting usage stats: {str(e)}"}
