# FastAPI Backend for Agent Search

This FastAPI backend provides API endpoints for the Agent Search application, integrating with Supabase for authentication and database operations.

## Setup Instructions

### 1. Environment Setup

1. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Supabase JWT secret:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Find the JWT Settings section
   - Copy the JWT Secret and paste it in your `.env` file

### 2. Database Configuration

The FastAPI backend is designed to connect to the same Supabase database that your frontend is using. Make sure the `DATABASE_URL` in your `.env` file points to the correct database.

### 3. Running the Server

Start the FastAPI server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

## API Documentation

Once the server is running, you can access the auto-generated API documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Frontend Integration Guide

To integrate your Next.js frontend with this FastAPI backend, follow these steps:

### 1. Create an API Client

Create a new file in your frontend project to handle API calls to the FastAPI backend:

```typescript
// src/integrations/fastapi/client.ts

import { supabase } from "@/integrations/supabase/client";

const API_URL = "http://localhost:8000/api";

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const apiClient = {
  // Agent Templates
  async getAgentTemplates() {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch agent templates");
    return response.json();
  },

  async getAgentTemplate(id: string) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates/${id}`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch agent template");
    return response.json();
  },

  // Hired Agents
  async getHiredAgents() {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/hired_agents`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch hired agents");
    return response.json();
  },

  async hireAgent(data: any) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/hired_agents`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to hire agent");
    return response.json();
  },

  async updateHiredAgent(id: string, data: any) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/hired_agents/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update hired agent");
    return response.json();
  },

  // Profile
  async getProfile() {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/auth/me`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  async updateProfile(data: any) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/profiles/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update profile");
    return response.json();
  },
};
```

### 2. Update Your Components

Replace direct Supabase calls with calls to your new API client. For example:

#### Before (using Supabase directly):

```typescript
// In Marketplace.tsx
const fetchHiredAgents = async () => {
  const { data, error } = await supabase
    .from("hired_agents")
    .select("*")
    .eq("user_id", user?.id);

  if (error) {
    console.error("Error fetching hired agents:", error);
    return;
  }

  setHiredAgents(data || []);
};
```

#### After (using FastAPI backend):

```typescript
// In Marketplace.tsx
import { apiClient } from "@/integrations/fastapi/client";

const fetchHiredAgents = async () => {
  try {
    const data = await apiClient.getHiredAgents();
    setHiredAgents(data || []);
  } catch (error) {
    console.error("Error fetching hired agents:", error);
  }
};
```

### 3. Schema Differences

Note that there might be some schema differences between your frontend Supabase types and the FastAPI backend models:

1. In the frontend, you have `agent_configurations` in your types, but the backend uses `agent_templates` as per the migrations.sql.
2. Make sure to adapt your frontend code to match the backend schema when making API calls.

### 4. Authentication Flow

1. The frontend will continue to use Supabase for user authentication (login/signup).
2. When making API calls to the FastAPI backend, include the Supabase JWT token in the Authorization header.
3. The FastAPI backend will validate this token and identify the user.

## Important Notes

1. The FastAPI backend expects the Supabase JWT token in the Authorization header for authenticated endpoints.
2. Make sure your CORS settings in the FastAPI backend allow requests from your frontend origin.
3. The backend models are based on the schema in `app/supabase/migrations.sql`.

### Run commands

1. cd fastapi_backend
2. python3 -m venv myenv
3. source myenv/bin/activate
4. (Optional) uv pip install -r requirements.txt
5. brew services start redis
6. uvicorn app.main:app or python run.py => starts BE
7. (In ending) brew services stop redis
8. (In ending) deactivate

###Other Redis commands

- brew services start redis
- brew services info redis
- brew services stop redis
- redis-server
- 127.0.0.1:6379> ping
