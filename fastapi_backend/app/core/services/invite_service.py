from typing import List, Dict, Any, Tuple, Optional
from uuid import UUID
import logging
import re
from app.models.models import FriendshipStatus
from app.core.profiling import profile_async
from app.core.utils.cache import invalidate_cache_item
from app.core.services.email_service import email_service
from app.core.config import settings
from pydantic import EmailStr

logger = logging.getLogger(__name__)

MAX_FRIENDS_FREE_TIER = 5  # Maximum friends for free tier
DEFAULT_PASSWORD = "Welcome123!"  # Default password for new users

class InviteService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    @profile_async("invite_service.invite_friends")
    async def invite_friends(self, user_id: UUID, emails: List[EmailStr]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Invite friends by email. For each email:
        1. If user exists, create friendship
        2. If user doesn't exist, create account and friendship
        """
        result = {
            "invited": [],
            "existing_friends": [],
            "errors": []
        }
        
        # Check if user has reached the maximum number of friends for their tier
        current_friends = await self._get_friends_count(user_id)
        user_tier = await self._get_user_tier(user_id)
        
        # Get user's profile for email templates
        user_profile = await self._get_user_profile(user_id)
        if not user_profile:
            result["errors"].append({
                "email": None,
                "error": "Failed to retrieve user profile"
            })
            return result
        
        # Check friend limit based on tier
        max_allowed = MAX_FRIENDS_FREE_TIER
        if user_tier.lower() != "hunter" and user_tier.lower() != "free":
            max_allowed = 10  # Higher tier users can have more friends
        
        remaining_slots = max_allowed - current_friends
        if remaining_slots <= 0:
            result["errors"].append({
                "email": None,
                "error": f"You have reached the maximum number of friends ({max_allowed}) for your tier"
            })
            return result
        
        # Process each email
        for email in emails[:remaining_slots]:  # Only process up to remaining slots
            try:
                # Check if email already exists in profiles
                existing_user = await self._find_user_by_email(email)
                
                if existing_user:
                    # User exists, check if already friends
                    is_friend = await self._check_friendship_exists(user_id, existing_user["id"])
                    
                    if is_friend:
                        result["existing_friends"].append({
                            "email": email,
                            "profile_id": existing_user["id"],
                            "status": "already_friends"
                        })
                    else:
                        # Create friendship
                        friendship, message = await self._create_friendship(user_id, existing_user["id"])
                        if friendship:
                            result["invited"].append({
                                "email": email,
                                "profile_id": existing_user["id"],
                                "status": "friendship_created"
                            })
                        else:
                            result["errors"].append({
                                "email": email,
                                "error": message
                            })
                else:
                    # User doesn't exist, create account and friendship
                    # 1. Generate name from email
                    name = self._generate_name_from_email(email)
                    
                    # 2. Create user account
                    new_user = await self._create_user_account(email, name)
                    
                    if new_user:
                        # 3. Create friendship
                        friendship, message = await self._create_friendship(user_id, new_user["id"])
                        
                        if friendship:
                            # 4. Send welcome email with credentials
                            email_sent = await self._send_welcome_email(
                                email, 
                                name, 
                                user_profile.get("full_name", "A friend"),
                                user_profile.get("email", "")
                            )
                            
                            result["invited"].append({
                                "email": email,
                                "profile_id": new_user["id"],
                                "status": "account_created",
                                "email_sent": email_sent
                            })
                        else:
                            result["errors"].append({
                                "email": email,
                                "error": message
                            })
                    else:
                        result["errors"].append({
                            "email": email,
                            "error": "Failed to create user account"
                        })
            except Exception as e:
                logger.error(f"Error processing invitation for {email}: {str(e)}")
                result["errors"].append({
                    "email": email,
                    "error": str(e)
                })
        
        return result
    
    @profile_async("invite_service._get_friends_count")
    async def _get_friends_count(self, user_id: UUID) -> int:
        """Get count of user's friends"""
        try:
            # Count friendships where user is either requester or addressee and status is accepted
            requester_count = await self.supabase.table("friendships").select("id", count="exact").eq("requester_id", str(user_id)).eq("status", FriendshipStatus.ACCEPTED.value).execute()
            addressee_count = await self.supabase.table("friendships").select("id", count="exact").eq("addressee_id", str(user_id)).eq("status", FriendshipStatus.ACCEPTED.value).execute()
            
            return (requester_count.count or 0) + (addressee_count.count or 0)
        except Exception as e:
            logger.error(f"Error getting friends count: {e}")
            return 0
    
    @profile_async("invite_service._get_user_tier")
    async def _get_user_tier(self, user_id: UUID) -> str:
        """Get user's subscription tier"""
        try:
            user_subscription = await self.supabase.table("user_subscriptions").select("tier").eq("profile_id", str(user_id)).single().execute()
            return user_subscription.data.get("tier", "hunter") if user_subscription.data else "hunter"
        except Exception as e:
            logger.error(f"Error getting user tier: {e}")
            return "hunter"  # Default to free tier
    
    @profile_async("invite_service._get_user_profile")
    async def _get_user_profile(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get user's profile"""
        try:
            profile = await self.supabase.table("profiles").select("*").eq("id", str(user_id)).single().execute()
            return profile.data if profile.data else None
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return None
    
    @profile_async("invite_service._find_user_by_email")
    async def _find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email"""
        try:
            user = await self.supabase.table("profiles").select("*").eq("email", email).single().execute()
            return user.data if user.data else None
        except Exception as e:
            logger.error(f"Error finding user by email: {e}")
            return None
    
    @profile_async("invite_service._check_friendship_exists")
    async def _check_friendship_exists(self, user_id: UUID, friend_id: UUID) -> bool:
        """Check if friendship exists in either direction"""
        try:
            friendship1 = await self.supabase.table("friendships").select("id").eq("requester_id", str(user_id)).eq("addressee_id", str(friend_id)).execute()
            friendship2 = await self.supabase.table("friendships").select("id").eq("requester_id", str(friend_id)).eq("addressee_id", str(user_id)).execute()
            
            return bool(friendship1.data) or bool(friendship2.data)
        except Exception as e:
            logger.error(f"Error checking friendship: {e}")
            return False
    
    @profile_async("invite_service._create_friendship")
    async def _create_friendship(self, requester_id: UUID, addressee_id: UUID) -> Tuple[Optional[Dict[str, Any]], str]:
        """Create a friendship between two users"""
        try:
            # Create the friendship
            friendship_data = {
                "requester_id": str(requester_id),
                "addressee_id": str(addressee_id),
                "status": FriendshipStatus.ACCEPTED.value  # Auto-accept for invited friends
            }
            
            response = await self.supabase.table("friendships").insert(friendship_data).execute()
            
            if response.data:
                # Invalidate friends cache for both users
                invalidate_cache_item(f"friends:{requester_id}")
                invalidate_cache_item(f"friends:{addressee_id}")
                return response.data[0], "Friendship created successfully"
            
            return None, "Failed to create friendship"
        except Exception as e:
            logger.error(f"Error creating friendship: {e}")
            return None, f"Error: {str(e)}"
    
    @profile_async("invite_service._create_user_account")
    async def _create_user_account(self, email: str, name: str) -> Optional[Dict[str, Any]]:
        """Create a new user account with default password"""
        try:
            # Use service key client for admin operations
            from supabase import create_client
            
            # Validate service role key is configured
            if not settings.SUPABASE_SERVICE_ROLE_KEY:
                logger.error("Supabase service role key not configured")
                return None
            
            # Create admin client with service role key
            admin_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            
            # Create user directly with admin privileges - no email sent
            auth_response = admin_client.auth.admin.create_user({
                "email": email,
                "password": DEFAULT_PASSWORD,
                "email_confirm": True,  # Directly confirm email
                "user_metadata": {
                    "full_name": name,
                }
            })
            
            if not auth_response.user:
                logger.error(f"Failed to create user account for {email}")
                return None
            
            logger.info(f"User account created for {email} with ID {auth_response.user.id}")
            
            # Wait for profile to be created by trigger
            # Sleep for a short time to allow the trigger to run
            import asyncio
            await asyncio.sleep(1)
            
            # Get the profile
            profile = await self.supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()
            
            if not profile.data:
                logger.error(f"Profile not found for newly created user {email}")
                return None
            
            return profile.data
        except Exception as e:
            logger.error(f"Error creating user account: {e}")
            return None
    
    @profile_async("invite_service._send_welcome_email")
    async def _send_welcome_email(self, to_email: str, user_name: str, inviter_name: str, inviter_email: str) -> bool:
        """Send welcome email with login credentials"""
        subject = f"{inviter_name} has invited you to join DiscoverMinds"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    Welcome to DiscoverMinds!
                </h2>
                
                <p>Hi {user_name},</p>
                
                <p><strong>{inviter_name}</strong> ({inviter_email}) has invited you to join DiscoverMinds as a friend.</p>
                
                <p>We've created an account for you with the following credentials:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Email:</strong> {to_email}</p>
                    <p><strong>Password:</strong> {DEFAULT_PASSWORD}</p>
                </div>
                
                <p>You can log in at <a href="{settings.FRONTEND_URL}">{settings.FRONTEND_URL}</a></p>
                
                <p>For security reasons, please change your password after logging in.</p>
                
                <p style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>Team DiscoverMinds</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This email was automatically generated by DiscoverMinds. 
                    If you believe this was sent in error, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        try:
            result = await email_service.send_email(to_email, subject, body)
            return result
        except Exception as e:
            logger.error(f"Error sending welcome email: {e}")
            return False
    
    def _generate_name_from_email(self, email: str) -> str:
        """Generate a name from email address"""
        # Extract the part before @ and remove numbers and special chars
        name_part = email.split('@')[0]
        
        # Replace dots, underscores, etc. with spaces
        name_part = re.sub(r'[._-]', ' ', name_part)
        
        # Remove digits and special characters
        name_part = re.sub(r'[^a-zA-Z\s]', '', name_part)
        
        # Title case the name
        name_part = name_part.title()
        
        # If empty after cleaning, use a generic name
        if not name_part.strip():
            name_part = "New User"
            
        return name_part
