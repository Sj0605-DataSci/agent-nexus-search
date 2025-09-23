from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging
from app.models.schemas import (
    StandardResponse, StandardJSONResponse,
    FriendshipCreate, FriendshipUpdate, FriendshipResponse, FriendProfileResponse,
    InviteFriendsRequest, InviteFriendsResponse, FriendshipSummaryResponse
)
from app.models.models import FriendshipStatus
from app.core.services.friendship_service import FriendshipService
from app.core.services.invite_service import InviteService
from app.core.auth import get_current_user
from app.core.profiling import profile_async
from app.db.clients import get_async_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/friendships",
    tags=["friendships"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=StandardResponse)
@profile_async("routes.friendships.get_friends_list")
async def get_friends_list(
    type: str = Query("all", description="Type of friends list to retrieve: 'all', 'accepted', 'pending', 'sent', or 'summary'"),
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """
    Get friends list based on the specified type parameter.
    
    - type=all: Return all types of friendships (default)
    - type=accepted: Return only accepted friendships
    - type=pending: Return only pending friend requests received
    - type=sent: Return only pending friend requests sent
    - type=summary: Return comprehensive summary with all types and counts
    """
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    
    # Process based on the requested type
    if type == "summary":
        # Get comprehensive summary
        data = await friendship_service.get_friendship_summary(user.id)
        message = "Friendship summary retrieved successfully"
    elif type == "accepted":
        # Get accepted friends only
        data = await friendship_service.get_friends(user.id)
        message = "Friends retrieved successfully"
    elif type == "pending":
        # Get pending requests only
        data = await friendship_service.get_pending_requests(user.id)
        message = "Pending friend requests retrieved successfully"
    elif type == "sent":
        # Get sent requests only
        data = await friendship_service.get_sent_requests(user.id)
        message = "Sent friend requests retrieved successfully"
    else:  # "all" or any other value
        # Get all friendship data
        summary = await friendship_service.get_friendship_summary(user.id)
        data = {
            "accepted": summary.friends,
            "pending": summary.pending_requests,
            "sent": summary.sent_requests,
            "total_friends": summary.total_friends,
            "total_pending": summary.total_pending,
            "total_sent": summary.total_sent
        }
        message = "All friendship data retrieved successfully"
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=message,
            data=data
        )
    )

# Keep these endpoints for backward compatibility, but mark as deprecated
@router.get("/summary", response_model=StandardResponse[FriendshipSummaryResponse], deprecated=True)
@profile_async("routes.friendships.get_friendship_summary")
async def get_friendship_summary(
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """[DEPRECATED] Use GET /friendships/?type=summary instead"""
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    summary = await friendship_service.get_friendship_summary(user.id)
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Friendship summary retrieved successfully",
            data=summary
        )
    )

@router.get("/accepted", response_model=StandardResponse[List[FriendProfileResponse]], deprecated=True)
@profile_async("routes.friendships.get_accepted_friends")
async def get_accepted_friends(
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """[DEPRECATED] Use GET /friendships/?type=accepted instead"""
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    friends = await friendship_service.get_friends(user.id)
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Friends retrieved successfully",
            data=friends
        )
    )

@router.get("/pending", response_model=StandardResponse[List[FriendProfileResponse]], deprecated=True)
@profile_async("routes.friendships.get_pending_requests")
async def get_pending_requests(
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """[DEPRECATED] Use GET /friendships/?type=pending instead"""
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    pending_requests = await friendship_service.get_pending_requests(user.id)
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Pending friend requests retrieved successfully",
            data=pending_requests
        )
    )

@router.get("/sent", response_model=StandardResponse[List[FriendProfileResponse]], deprecated=True)
@profile_async("routes.friendships.get_sent_requests")
async def get_sent_requests(
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """[DEPRECATED] Use GET /friendships/?type=sent instead"""
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    sent_requests = await friendship_service.get_sent_requests(user.id)
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Sent friend requests retrieved successfully",
            data=sent_requests
        )
    )

@router.post("/invite", response_model=StandardResponse[InviteFriendsResponse])
@profile_async("routes.friendships.invite_friends")
async def invite_friends(
    invite_request: InviteFriendsRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """
    Invite friends by email. For each email:
    1. If user exists, create friendship
    2. If user doesn't exist, create account and friendship
    
    Limited to 3 emails per request. For free tier users, limited to 5 total friends.
    """
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if emails are provided
    if not invite_request.emails or len(invite_request.emails) == 0:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="No email addresses provided",
                data=None
            ),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if user is trying to invite themselves
    if user.email in invite_request.emails:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="You cannot invite yourself",
                data=None
            ),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Process invitations
    invite_service = InviteService(supabase)
    result = await invite_service.invite_friends(user.id, invite_request.emails)
    
    # Create response
    response = InviteFriendsResponse(
        invited=result["invited"],
        existing_friends=result["existing_friends"],
        errors=result["errors"]
    )
    
    # Determine success based on results
    success = len(result["invited"]) > 0 or len(result["existing_friends"]) > 0
    message = "Friends invited successfully"
    
    if not success and len(result["errors"]) > 0:
        message = "Failed to invite friends"
    elif len(result["errors"]) > 0:
        message = "Some invitations were successful, but others failed"
    
    return StandardJSONResponse(
        StandardResponse(
            success=success,
            status_code=status.HTTP_200_OK,
            message=message,
            data=response
        ),
        status_code=status.HTTP_200_OK
    )

@router.patch("/{friendship_id}", response_model=StandardResponse[FriendshipResponse])
@profile_async("routes.friendships.update_friendship")
async def update_friendship(
    friendship_id: UUID,
    friendship_update: FriendshipUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """
    Update a friendship status (accept or reject a friend request)
    """
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    updated_friendship, message = await friendship_service.update_friendship_status(
        friendship_id, friendship_update.status, user.id
    )
    
    if not updated_friendship:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message=message,
                data=None
            ),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Convert to response model
    friendship_response = FriendshipResponse(
        id=updated_friendship["id"],
        requester_id=updated_friendship["requester_id"],
        addressee_id=updated_friendship["addressee_id"],
        status=FriendshipStatus(updated_friendship["status"]),
        created_at=updated_friendship["created_at"],
        updated_at=updated_friendship["updated_at"]
    )
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=message,
            data=friendship_response
        )
    )

@router.delete("/{friend_id}", response_model=StandardResponse)
@profile_async("routes.friendships.delete_friendship")
async def delete_friendship(
    friend_id: UUID,
    user=Depends(get_current_user),
    supabase=Depends(get_async_supabase_client)
):
    """
    Delete a friendship (unfriend a user)
    """
    if not user:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication required",
                data=None
            ),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    friendship_service = FriendshipService(supabase)
    success, message = await friendship_service.delete_friendship(user.id, friend_id)
    
    if not success:
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message=message,
                data=None
            ),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    return StandardJSONResponse(
        StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=message,
            data=None
        )
    )
