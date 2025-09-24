import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import FriendshipStatus
from unittest.mock import patch, MagicMock

client = TestClient(app)

# Mock user for authentication
mock_user = {
    "id": str(uuid.uuid4()),
    "email": "test@example.com",
    "full_name": "Test User"
}

# Mock authentication dependency
@pytest.fixture
def mock_auth():
    with patch("app.api.routes.friendships.get_current_user") as mock:
        mock.return_value = MagicMock(id=mock_user["id"], email=mock_user["email"], full_name=mock_user["full_name"])
        yield mock

# Mock Supabase client
@pytest.fixture
def mock_supabase():
    with patch("app.api.routes.friendships.get_async_supabase_client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client

# Mock FriendshipService
@pytest.fixture
def mock_friendship_service():
    with patch("app.api.routes.friendships.FriendshipService") as mock:
        mock_service = MagicMock()
        mock.return_value = mock_service
        yield mock_service

# Test get_friendship_summary endpoint
def test_get_friendship_summary(mock_auth, mock_supabase, mock_friendship_service):
    # Create mock data
    friend1_id = str(uuid.uuid4())
    friend2_id = str(uuid.uuid4())
    pending1_id = str(uuid.uuid4())
    sent1_id = str(uuid.uuid4())
    
    # Mock friendship summary
    mock_summary = {
        "friends": [
            {
                "id": friend1_id,
                "full_name": "Friend One",
                "email": "friend1@example.com",
                "linkedin_url": "https://linkedin.com/in/friend1",
                "status": FriendshipStatus.ACCEPTED.value,
                "created_at": "2023-01-01T00:00:00Z"
            },
            {
                "id": friend2_id,
                "full_name": "Friend Two",
                "email": "friend2@example.com",
                "linkedin_url": "https://linkedin.com/in/friend2",
                "status": FriendshipStatus.ACCEPTED.value,
                "created_at": "2023-01-02T00:00:00Z"
            }
        ],
        "pending_requests": [
            {
                "id": pending1_id,
                "full_name": "Pending One",
                "email": "pending1@example.com",
                "linkedin_url": "https://linkedin.com/in/pending1",
                "status": FriendshipStatus.PENDING.value,
                "created_at": "2023-01-03T00:00:00Z"
            }
        ],
        "sent_requests": [
            {
                "id": sent1_id,
                "full_name": "Sent One",
                "email": "sent1@example.com",
                "linkedin_url": "https://linkedin.com/in/sent1",
                "status": FriendshipStatus.PENDING.value,
                "created_at": "2023-01-04T00:00:00Z"
            }
        ],
        "total_friends": 2,
        "total_pending": 1,
        "total_sent": 1
    }
    
    # Set up mock return value
    mock_friendship_service.get_friendship_summary.return_value = mock_summary
    
    # Make request
    response = client.get("/api/friendships/summary")
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Friendship summary retrieved successfully"
    
    # Check summary data
    summary = data["data"]
    assert len(summary["friends"]) == 2
    assert len(summary["pending_requests"]) == 1
    assert len(summary["sent_requests"]) == 1
    assert summary["total_friends"] == 2
    assert summary["total_pending"] == 1
    assert summary["total_sent"] == 1
    
    # Check that the service was called with the correct user ID
    mock_friendship_service.get_friendship_summary.assert_called_once_with(mock_user["id"])

# Test unauthorized access
def test_get_friendship_summary_unauthorized():
    # Mock auth to return None (unauthorized)
    with patch("app.api.routes.friendships.get_current_user", return_value=None):
        response = client.get("/api/friendships/summary")
        
        # Check response
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["message"] == "Authentication required"
