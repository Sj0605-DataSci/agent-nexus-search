import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API base URL
BASE_URL = "http://localhost:8000/api"

# Test data
test_agent_template = {
    "name": "Test Agent",
    "category": "Test",
    "description": "A test agent template"
}

def get_supabase_token():
    """
    In a real test, you would get a valid Supabase token.
    For manual testing, you can paste a valid token here or set it as an environment variable.
    """
    token = os.getenv("SUPABASE_TEST_TOKEN")
    if not token:
        print("WARNING: No SUPABASE_TEST_TOKEN environment variable found.")
        print("Please set this variable with a valid Supabase JWT token for testing.")
        print("You can get this token from your browser's localStorage after logging in to your frontend.")
        return None
    return token

def test_verify_token(token):
    """Test token verification endpoint"""
    if not token:
        print("Skipping token verification test - no token provided")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/auth/verify-token", headers=headers)
    
    print(f"Token verification: {response.status_code}")
    print(response.json() if response.status_code == 200 else response.text)
    
    return response.status_code == 200

def test_get_current_user(token):
    """Test getting current user info"""
    if not token:
        print("Skipping get current user test - no token provided")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    
    print(f"Get current user: {response.status_code}")
    print(json.dumps(response.json(), indent=2) if response.status_code == 200 else response.text)

def test_agent_templates(token):
    """Test CRUD operations for agent templates"""
    if not token:
        print("Skipping agent templates test - no token provided")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create a new agent template
    print("\n--- Creating agent template ---")
    response = requests.post(
        f"{BASE_URL}/agent_templates",
        headers=headers,
        json=test_agent_template
    )
    print(f"Create agent template: {response.status_code}")
    
    if response.status_code == 201:
        template_data = response.json()
        template_id = template_data["id"]
        print(f"Created template ID: {template_id}")
        print(json.dumps(template_data, indent=2))
        
        # Get the created template
        print("\n--- Getting agent template ---")
        response = requests.get(
            f"{BASE_URL}/agent_templates/{template_id}",
            headers=headers
        )
        print(f"Get agent template: {response.status_code}")
        print(json.dumps(response.json(), indent=2) if response.status_code == 200 else response.text)
        
        # Update the template
        print("\n--- Updating agent template ---")
        update_data = {"name": "Updated Test Agent"}
        response = requests.put(
            f"{BASE_URL}/agent_templates/{template_id}",
            headers=headers,
            json=update_data
        )
        print(f"Update agent template: {response.status_code}")
        print(json.dumps(response.json(), indent=2) if response.status_code == 200 else response.text)
        
        # List all templates
        print("\n--- Listing agent templates ---")
        response = requests.get(
            f"{BASE_URL}/agent_templates",
            headers=headers
        )
        print(f"List agent templates: {response.status_code}")
        templates = response.json() if response.status_code == 200 else []
        print(f"Found {len(templates)} templates")
        
        # Delete the template
        print("\n--- Deleting agent template ---")
        response = requests.delete(
            f"{BASE_URL}/agent_templates/{template_id}",
            headers=headers
        )
        print(f"Delete agent template: {response.status_code}")
        print("Template deleted successfully" if response.status_code == 204 else response.text)
    else:
        print(f"Failed to create template: {response.text}")

def main():
    token = get_supabase_token()
    
    if test_verify_token(token):
        test_get_current_user(token)
        test_agent_templates(token)
    else:
        print("Token verification failed. Skipping remaining tests.")

if __name__ == "__main__":
    main()
