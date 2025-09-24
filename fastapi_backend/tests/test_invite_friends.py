import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
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

# Mock InviteService
@pytest.fixture
def mock_invite_service():
    with patch("app.api.routes.friendships.InviteService") as mock:
        mock_service = MagicMock()
        mock.return_value = mock_service
        yield mock_service

# Test invite_friends endpoint
def test_invite_friends(mock_auth, mock_supabase, mock_invite_service):
    # Mock invite_friends method
    mock_invite_service.invite_friends.return_value = {
        "invited": [
            {
                "email": "friend1@example.com",
                "profile_id": str(uuid.uuid4()),
                "status": "account_created",
                "email_sent": True
            }
        ],
        "existing_friends": [],
        "errors": []
    }
    
    response = client.post(
        "/api/friendships/invite",
        json={"emails": ["friend1@example.com"]}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Friends invited successfully" in data["message"]
    assert len(data["data"]["invited"]) == 1
    assert data["data"]["invited"][0]["email"] == "friend1@example.com"

# Test invite_friends with existing friends
def test_invite_friends_existing(mock_auth, mock_supabase, mock_invite_service):
    # Mock invite_friends method
    mock_invite_service.invite_friends.return_value = {
        "invited": [],
        "existing_friends": [
            {
                "email": "friend1@example.com",
                "profile_id": str(uuid.uuid4()),
                "status": "already_friends"
            }
        ],
        "errors": []
    }
    
    response = client.post(
        "/api/friendships/invite",
        json={"emails": ["friend1@example.com"]}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["existing_friends"]) == 1
    assert data["data"]["existing_friends"][0]["status"] == "already_friends"

# Test invite_friends with errors
def test_invite_friends_errors(mock_auth, mock_supabase, mock_invite_service):
    # Mock invite_friends method
    mock_invite_service.invite_friends.return_value = {
        "invited": [],
        "existing_friends": [],
        "errors": [
            {
                "email": "friend1@example.com",
                "error": "Failed to create user account"
            }
        ]
    }
    
    response = client.post(
        "/api/friendships/invite",
        json={"emails": ["friend1@example.com"]}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Failed to invite friends" in data["message"]
    assert len(data["data"]["errors"]) == 1
    assert data["data"]["errors"][0]["email"] == "friend1@example.com"

# Test invite_friends with partial success
def test_invite_friends_partial_success(mock_auth, mock_supabase, mock_invite_service):
    # Mock invite_friends method
    mock_invite_service.invite_friends.return_value = {
        "invited": [
            {
                "email": "friend1@example.com",
                "profile_id": str(uuid.uuid4()),
                "status": "account_created",
                "email_sent": True
            }
        ],
        "existing_friends": [],
        "errors": [
            {
                "email": "friend2@example.com",
                "error": "Failed to create user account"
            }
        ]
    }
    
    response = client.post(
        "/api/friendships/invite",
        json={"emails": ["friend1@example.com", "friend2@example.com"]}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Some invitations were successful" in data["message"]
    assert len(data["data"]["invited"]) == 1
    assert len(data["data"]["errors"]) == 1
