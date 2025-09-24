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

# Mock friend user
mock_friend = {
    "id": str(uuid.uuid4()),
    "email": "friend@example.com",
    "full_name": "Friend User"
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
    with patch("app.api.routes.friendships.get_supabase_client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client

# Test get_friends endpoint
def test_get_friends(mock_auth, mock_supabase):
    # Mock friendship service get_friends method
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[
        {
            "id": str(uuid.uuid4()),
            "requester_id": mock_user["id"],
            "addressee_id": mock_friend["id"],
            "status": FriendshipStatus.ACCEPTED.value,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
            "addressee": mock_friend
        }
    ])
    
    response = client.get("/api/friendships/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    assert data["data"][0]["id"] == mock_friend["id"]

# Test create_friendship endpoint
def test_create_friendship(mock_auth, mock_supabase):
    # Mock profile check
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[mock_friend])
    
    # Mock friendship creation
    friendship_id = str(uuid.uuid4())
    mock_supabase.table().insert().execute.return_value = MagicMock(data=[
        {
            "id": friendship_id,
            "requester_id": mock_user["id"],
            "addressee_id": mock_friend["id"],
            "status": FriendshipStatus.PENDING.value,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
    ])
    
    response = client.post(
        "/api/friendships/",
        json={"addressee_id": mock_friend["id"]}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == friendship_id
    assert data["data"]["requester_id"] == mock_user["id"]
    assert data["data"]["addressee_id"] == mock_friend["id"]
    assert data["data"]["status"] == FriendshipStatus.PENDING.value

# Test update_friendship endpoint
def test_update_friendship(mock_auth, mock_supabase):
    friendship_id = str(uuid.uuid4())
    
    # Mock get friendship
    mock_supabase.table().select().eq().single().execute.return_value = MagicMock(data={
        "id": friendship_id,
        "requester_id": mock_friend["id"],
        "addressee_id": mock_user["id"],
        "status": FriendshipStatus.PENDING.value,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
    })
    
    # Mock update friendship
    mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[
        {
            "id": friendship_id,
            "requester_id": mock_friend["id"],
            "addressee_id": mock_user["id"],
            "status": FriendshipStatus.ACCEPTED.value,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
    ])
    
    response = client.patch(
        f"/api/friendships/{friendship_id}",
        json={"status": FriendshipStatus.ACCEPTED.value}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == friendship_id
    assert data["data"]["status"] == FriendshipStatus.ACCEPTED.value

# Test delete_friendship endpoint
def test_delete_friendship(mock_auth, mock_supabase):
    # Mock find friendship
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[
        {
            "id": str(uuid.uuid4()),
            "requester_id": mock_user["id"],
            "addressee_id": mock_friend["id"],
            "status": FriendshipStatus.ACCEPTED.value,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
    ])
    
    # Mock delete friendship
    mock_supabase.table().delete().eq().execute.return_value = MagicMock(data=[])
    
    response = client.delete(f"/api/friendships/{mock_friend['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Friendship removed successfully" in data["message"]
