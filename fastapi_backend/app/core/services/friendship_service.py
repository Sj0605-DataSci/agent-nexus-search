from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import logging
from app.models.models import FriendshipStatus
from app.models.schemas import FriendProfileResponse,FriendshipSummaryResponse
from app.core.profiling import profile_async
from app.core.utils.cache import get_cached_item, cache_item, invalidate_cache_item

logger = logging.getLogger(__name__)

MAX_FRIENDS_FREE_TIER = 5  # Maximum friends for free tier

class FriendshipService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    @profile_async("friendship_service.get_friends")
    async def get_friends(self, user_id: UUID) -> List[FriendProfileResponse]:
        """Get all friends of a user (accepted friendships)"""
        # Try to get from cache first
        cache_key = f"friends:{user_id}"
        cached_friends = get_cached_item(cache_key)
        if cached_friends:
            logger.info(f"Cache hit for friends:{user_id}")
            return cached_friends
        
        # Get all friendships where user is either requester or addressee and status is accepted
        try:
            # First query: user is requester
            requester_response = await self.supabase.table("friendships").select(
                "id, status, created_at, updated_at, addressee:addressee_id(*)"
            ).eq("requester_id", str(user_id)).eq("status", FriendshipStatus.ACCEPTED.value).execute()
            
            # Second query: user is addressee
            addressee_response = await self.supabase.table("friendships").select(
                "id, status, created_at, updated_at, requester:requester_id(*)"
            ).eq("addressee_id", str(user_id)).eq("status", FriendshipStatus.ACCEPTED.value).execute()
            
            friends = []
            
            # Process requester response
            if requester_response.data:
                for item in requester_response.data:
                    if "addressee" in item and item["addressee"]:
                        friend = item["addressee"]
                        friends.append(FriendProfileResponse(
                            id=friend["id"],  # Profile ID
                            friendship_id=item["id"],  # Friendship record ID
                            full_name=friend.get("full_name"),
                            email=friend.get("email"),
                            linkedin_url=friend.get("linkedin_url"),
                            status=FriendshipStatus.ACCEPTED,
                            created_at=item["created_at"]
                        ))
            
            # Process addressee response
            if addressee_response.data:
                for item in addressee_response.data:
                    if "requester" in item and item["requester"]:
                        friend = item["requester"]
                        friends.append(FriendProfileResponse(
                            id=friend["id"],  # Profile ID
                            friendship_id=item["id"],  # Friendship record ID
                            full_name=friend.get("full_name"),
                            email=friend.get("email"),
                            linkedin_url=friend.get("linkedin_url"),
                            status=FriendshipStatus.ACCEPTED,
                            created_at=item["created_at"]
                        ))
            
            # Cache the result
            cache_item(cache_key, friends, ttl=300)  # Cache for 5 minutes
            
            return friends
        except Exception as e:
            logger.error(f"Error getting friends: {e}")
            return []
    
    @profile_async("friendship_service.get_pending_requests")
    async def get_pending_requests(self, user_id: UUID) -> List[FriendProfileResponse]:
        """Get all pending friend requests for a user"""
        try:
            # Get all friendships where user is addressee and status is pending
            response = await self.supabase.table("friendships").select(
                "id, status, created_at, updated_at, requester:requester_id(*)"
            ).eq("addressee_id", str(user_id)).eq("status", FriendshipStatus.PENDING.value).execute()
            
            pending_requests = []
            
            if response.data:
                for item in response.data:
                    if "requester" in item and item["requester"]:
                        requester = item["requester"]
                        pending_requests.append(FriendProfileResponse(
                            id=requester["id"],  # Profile ID
                            friendship_id=item["id"],  # Friendship record ID
                            full_name=requester.get("full_name"),
                            email=requester.get("email"),
                            linkedin_url=requester.get("linkedin_url"),
                            status=FriendshipStatus.PENDING,
                            created_at=item["created_at"]
                        ))
            
            return pending_requests
        except Exception as e:
            logger.error(f"Error getting pending requests: {e}")
            return []
    
    @profile_async("friendship_service.get_sent_requests")
    async def get_sent_requests(self, user_id: UUID) -> List[FriendProfileResponse]:
        """Get all friend requests sent by a user that are still pending"""
        try:
            # Get all friendships where user is requester and status is pending
            response = await self.supabase.table("friendships").select(
                "id, status, created_at, updated_at, addressee:addressee_id(*)"
            ).eq("requester_id", str(user_id)).eq("status", FriendshipStatus.PENDING.value).execute()
            
            sent_requests = []
            
            if response.data:
                for item in response.data:
                    if "addressee" in item and item["addressee"]:
                        addressee = item["addressee"]
                        sent_requests.append(FriendProfileResponse(
                            id=addressee["id"],  # Profile ID
                            friendship_id=item["id"],  # Friendship record ID
                            full_name=addressee.get("full_name"),
                            email=addressee.get("email"),
                            linkedin_url=addressee.get("linkedin_url"),
                            status=FriendshipStatus.PENDING,
                            created_at=item["created_at"]
                        ))
            
            return sent_requests
        except Exception as e:
            logger.error(f"Error getting sent requests: {e}")
            return []
    
    @profile_async("friendship_service.get_friendship")
    async def get_friendship(self, friendship_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a specific friendship by ID"""
        try:
            response = await self.supabase.table("friendships").select("*").eq("id", str(friendship_id)).single().execute()
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error getting friendship {friendship_id}: {e}")
            return None
    
    @profile_async("friendship_service.create_friendship")
    async def create_friendship(self, requester_id: UUID, addressee_id: UUID) -> Tuple[Optional[Dict[str, Any]], str]:
        """Create a new friendship (friend request)"""
        # Check if users are already friends or have a pending request
        try:
            # Check if friendship already exists in either direction
            existing_friendship1 = await self.supabase.table("friendships").select("*").eq("requester_id", str(requester_id)).eq("addressee_id", str(addressee_id)).execute()
            existing_friendship2 = await self.supabase.table("friendships").select("*").eq("requester_id", str(addressee_id)).eq("addressee_id", str(requester_id)).execute()
            
            if existing_friendship1.data or existing_friendship2.data:
                return None, "A friendship or request already exists between these users"
            
            # Check if requester has reached the maximum number of friends for their tier
            current_friends = await self.get_friends(requester_id)
            
            # Get user's subscription tier
            user_subscription = await self.supabase.table("user_subscriptions").select("tier").eq("profile_id", str(requester_id)).single().execute()
            
            # Default to free tier if no subscription found
            tier = user_subscription.data.get("tier", "hunter") if user_subscription.data else "hunter"
            
            # Check friend limit based on tier
            if tier.lower() == "hunter" and len(current_friends) >= MAX_FRIENDS_FREE_TIER:
                return None, f"You have reached the maximum number of friends ({MAX_FRIENDS_FREE_TIER}) for your tier"
            
            # Create the friendship
            friendship_data = {
                "requester_id": str(requester_id),
                "addressee_id": str(addressee_id),
                "status": FriendshipStatus.PENDING.value
            }
            
            response = await self.supabase.table("friendships").insert(friendship_data).execute()
            
            if response.data:
                # Invalidate friends cache for both users
                invalidate_cache_item(f"friends:{requester_id}")
                invalidate_cache_item(f"friends:{addressee_id}")
                return response.data[0], "Friend request sent successfully"
            
            return None, "Failed to create friendship"
        except Exception as e:
            logger.error(f"Error creating friendship: {e}")
            return None, f"Error: {str(e)}"
    
    @profile_async("friendship_service.update_friendship_status")
    async def update_friendship_status(self, friendship_id: UUID, new_status: FriendshipStatus, user_id: UUID) -> Tuple[Optional[Dict[str, Any]], str]:
        """Update the status of a friendship"""
        try:
            # Get the friendship
            friendship = await self.get_friendship(friendship_id)
            
            if not friendship:
                return None, "Friendship not found"
            
            # Verify that the user is the addressee of the friendship
            if str(user_id) != str(friendship["addressee_id"]) and str(user_id) != str(friendship["requester_id"]):
                return None, "You are not authorized to update this friendship"
            
            # If accepting, check if addressee has reached the maximum number of friends for their tier
            if new_status == FriendshipStatus.ACCEPTED:
                current_friends = await self.get_friends(user_id)
                
                # Get user's subscription tier
                user_subscription = await self.supabase.table("user_subscriptions").select("tier").eq("profile_id", str(user_id)).single().execute()
                
                # Default to free tier if no subscription found
                tier = user_subscription.data.get("tier", "hunter") if user_subscription.data else "hunter"
                
                # Check friend limit based on tier
                if tier.lower() == "hunter" and len(current_friends) >= MAX_FRIENDS_FREE_TIER:
                    return None, f"You have reached the maximum number of friends ({MAX_FRIENDS_FREE_TIER}) for your tier"
            
            # Update the friendship status
            response = await self.supabase.table("friendships").update({"status": new_status.value}).eq("id", str(friendship_id)).execute()
            
            if response.data:
                # Invalidate friends cache for both users
                invalidate_cache_item(f"friends:{friendship['requester_id']}")
                invalidate_cache_item(f"friends:{friendship['addressee_id']}")
                
                status_message = "Friend request accepted" if new_status == FriendshipStatus.ACCEPTED else "Friend request rejected"
                return response.data[0], status_message
            
            return None, "Failed to update friendship"
        except Exception as e:
            logger.error(f"Error updating friendship: {e}")
            return None, f"Error: {str(e)}"
    
    @profile_async("friendship_service.get_friendship_summary")
    async def get_friendship_summary(self, user_id: UUID) -> FriendshipSummaryResponse:
        """Get a comprehensive summary of all friendship-related data for a user"""
        try:
            # Get all friendship data in parallel
            import asyncio
            friends_task = self.get_friends(user_id)
            pending_task = self.get_pending_requests(user_id)
            sent_task = self.get_sent_requests(user_id)
            
            # Wait for all tasks to complete
            friends, pending_requests, sent_requests = await asyncio.gather(
                friends_task, pending_task, sent_task
            )
            
            # Create the summary response
            summary = FriendshipSummaryResponse(
                friends=friends,
                pending_requests=pending_requests,
                sent_requests=sent_requests,
                total_friends=len(friends),
                total_pending=len(pending_requests),
                total_sent=len(sent_requests)
            )
            
            return summary
        except Exception as e:
            logger.error(f"Error getting friendship summary: {e}")
            # Return empty summary on error
            return FriendshipSummaryResponse()
    
    @profile_async("friendship_service.delete_friendship")
    async def delete_friendship(self, user_id: UUID, friend_id: UUID) -> Tuple[bool, str]:
        """Delete a friendship between two users"""
        try:
            # Check if friendship exists in either direction
            friendship1 = await self.supabase.table("friendships").select("*").eq("requester_id", str(user_id)).eq("addressee_id", str(friend_id)).execute()
            friendship2 = await self.supabase.table("friendships").select("*").eq("requester_id", str(friend_id)).eq("addressee_id", str(user_id)).execute()
            
            friendship_id = None
            if friendship1.data:
                friendship_id = friendship1.data[0]["id"]
            elif friendship2.data:
                friendship_id = friendship2.data[0]["id"]
            
            if not friendship_id:
                return False, "Friendship not found"
            
            # Delete the friendship
            await self.supabase.table("friendships").delete().eq("id", friendship_id).execute()
            
            # Invalidate friends cache for both users
            invalidate_cache_item(f"friends:{user_id}")
            invalidate_cache_item(f"friends:{friend_id}")
            
            return True, "Friendship removed successfully"
        except Exception as e:
            logger.error(f"Error deleting friendship: {e}")
            return False, f"Error: {str(e)}"
