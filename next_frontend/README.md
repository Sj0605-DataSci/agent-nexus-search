# 🔍 DiscoverMinds.ai — Better People Search. Personal People Search.

## Overview

Traditional search engines and databases weren't built for finding people.

They don't understand your intent. They don't evolve with you. And they certainly don't know your networks.

**DiscoverMinds.ai** changes that.

> Imagine typing into a search bar and having an intelligent agent — one that knows your goals — help you find the right people, globally or within your own networks, instantly.

No more outdated databases. No more guessing filters. Just **deep, adaptive, and personal search for people.**

---

## Two Pillars of DiscoverMinds.ai

### **1. Better People Search**

Why rely on static databases or generic search engines that don't understand you?

With DiscoverMinds.ai, your search bar has an **agent built in** — listening to your intent, refining results through context, and helping you find the right people anywhere in the world.

**What makes it better:**

- Natural language queries — no complex filters
- An intelligent agent that learns from your searches
- Verified global results with contact details and insights
- Contextual relevance ranking based on your goals

---

### **2. Personal People Search**

Global search is powerful — but sometimes, you already have the right people in your orbit. The challenge? Your connections are **scattered**.

DiscoverMinds.ai lets you **connect your socials and communication platforms** — LinkedIn, Twitter, Gmail, Slack, and more — to make them searchable in one place.

**What makes it personal:**

- Search across your own networks as easily as the global web
- Combine global reach with local context
- Uncover hidden connections and opportunities you already have
- One interface for all your professional and community contacts

---

## How It Works

1. **Type your query in natural language**

   _"Find fintech investors I've emailed before who are based in Singapore."_

2. **Choose your search scope**
   - **Global**: Search the entire world
   - **Personal**: Search across your connected networks
   - Or combine both
3. **Get enriched, verified results**
   - Contact info, roles, activity, and more — ready to act on
4. **Refine through feedback**
   - Every search trains your personal agent to understand you better

---

## Why It's Different

❌ Old databases are static and incomplete

❌ Search engines are broad but not deep

❌ Social platforms lock your network inside silos

✅ DiscoverMinds.ai combines **global reach** with **personal context** — powered by an evolving agent that understands your intent.

---

## Use Cases

- **Recruiters**: _"Show me senior AI engineers in Europe with public repos, across my networks and globally."_
- **Sales Teams**: _"Find VPs of Operations in SaaS companies I've messaged before on LinkedIn."_
- **Founders & Investors**: _"Discover climate-tech founders worldwide who've recently raised."_
- **Community Managers**: _"Search Slack, Gmail, and LinkedIn for members working in healthtech."_

---

## The Vision

We believe the future of people discovery is both **global** and **personal**.

At **DiscoverMinds.ai**, we're building:

- Search that understands you and adapts to you
- Search that unifies your connections across platforms
- Search that feels like a conversation with someone who knows your goals

> Better people search. Personal people search. All in one place.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (v14+ with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Authentication**: [Supabase](https://supabase.io/)
- **Analytics**: [PostHog](https://posthog.com/)
- **Error Monitoring**: [Sentry](https://sentry.io/)
- **Linting & Formatting**: ESLint & Prettier

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.x or later)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd main-agent-nexus-search/next_frontend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file by copying the example file `.env`. You will need to fill in the required keys for Supabase, PostHog, and Sentry.

    ```
    # PostHog Analytics
    NEXT_PUBLIC_POSTHOG_API_KEY=YOUR_PROJECT_API_KEY_HERE
    NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
    ```

    ```bash
    cp .env .env.local
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    # or
    yarn dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📜 Available Scripts

- `npm run dev` / `yarn dev`: Starts the development server.
- `npm run build` / `yarn build`: Creates a production build.
- `npm run start` / `yarn start`: Starts the production server.
- `npm run lint` / `yarn lint`: Runs ESLint to find and fix issues.
- `npm run format` / `yarn format`: Formats code with Prettier.

---

## 📂 Project Structure

The project follows a feature-driven architecture within the Next.js App Router, emphasizing SOLID and DRY principles.

```
next_frontend/
├── public/                 # Static assets (images, fonts)
└── src/
    ├── app/
    │   ├── (with-sidebar)/   # Route group for pages sharing the main sidebar layout
    │   │   ├── agents/       # Agent marketplace and management
    │   │   ├── chat/         # Main chat interface
    │   │   ├── profile/      # User profile page
    │   │   └── layout.tsx    # Shared layout for this group
    │   ├── api/              # API routes
    │   ├── login/            # Login page
    │   ├── signup/           # Signup page
    │   ├── layout.tsx        # Root layout
    │   └── page.tsx          # Homepage
    │
    ├── components/
    │   ├── ui/               # Generic, reusable UI components (ShadCN)
    │   │   ├── button.tsx
    │   │   └── input.tsx
    │   ├── chats/            # Components specific to the chat feature
    │   ├── profile/          # Components for the user profile
    │   └── Homepage/         # Components used only on the homepage
    │
    ├── store/
    │   ├── agentsSlice.ts    # State for AI agents
    │   ├── profileSlice.ts   # State for user profile data
    │   ├── uiSlice.ts        # State for UI elements (e.g., modals, drawers)
    │   └── index.ts          # Redux store configuration
    │
    ├── lib/                    # Utility functions, API clients (e.g., apiClient.ts)
    ├── hooks/                  # Custom React hooks (e.g., useAuth.ts)
    ├── constant/               # App-wide constants
    └── types/                  # TypeScript type definitions
```

---

## ✍️ Code Style & Conventions

This project is maintained by a combination of human and AI developers. To ensure consistency, quality, and maintainability, we adhere to the following standards:

- **No Console Logs**: All `console.log()` statements must be removed before committing code. For debugging, use the browser's debugger or a dedicated logging service like Sentry.

- **No Unnecessary Comments**: Code should be self-documenting. Avoid leaving commented-out code blocks. Comments should only be used to explain complex algorithms or business logic that cannot be made clearer through better naming or structure.

- **AI-Driven Development**: Much of the boilerplate, component creation, and refactoring is handled by AI assistants. The code is designed to be clean, efficient, and easily understandable by both human and AI developers. Focus on clear intent and function signatures.

---

## 🌐 Deployment

This application is configured for deployment on platforms like Vercel or Netlify. Ensure all environment variables are set in the deployment environment's settings.

For a production build, run the following command and deploy the `.next` directory:

```bash
npm run build
# or
yarn build
```

---

## ⚙️ API Client & Endpoints

Our frontend communicates with the backend via a robust API client built on Axios. This setup is designed to be seamless and requires minimal configuration when adding new endpoints.

### `axiosInstance.ts` Considerations

The core of our API communication is `src/lib/api/axiosInstance.ts`. This file configures a global Axios instance with interceptors that automatically handle authentication:

- **Request Interceptor**: Before any request is sent, the interceptor automatically attaches the user's JWT access token to the `Authorization` header. It retrieves the token from `localStorage` or the active Supabase session.

- **Response Interceptor**: This interceptor manages token expiration and authentication errors:
  - **Token Refresh**: If a request fails with a `401 Unauthorized` error, the interceptor attempts to refresh the access token using the stored refresh token. While the token is being refreshed, any other failed requests are queued and retried once the new token is acquired.
  - **Forced Logout**: If a request fails with a `403 Forbidden` error, or if the token refresh fails, the user's session data is cleared from `localStorage`, and they are redirected to the `/login` page.

> **Key Takeaway**: Developers do not need to manually handle token management. Simply use the exported `axiosInstance` and the interceptors will take care of authentication.

### How to Add a New API Endpoint

All API endpoint functions are centralized in `src/integrations/fastapi/client.ts`. To add a new endpoint, follow this pattern:

1.  **Define the function** within the `apiClient` object.
2.  Use a `try...catch` block to handle potential errors gracefully.
3.  Call the appropriate `axiosInstance` method (`.get`, `.post`, `.put`, `.delete`).
4.  Use the `handleAxiosError` utility to process any errors.

**Example Template:**

Here is a template for adding a new `GET` endpoint to fetch a specific resource.

```typescript
// In src/integrations/fastapi/client.ts

import { YourResponseType } from "./types"; // 1. Make sure to define your response type

export const apiClient = {
  // ... existing methods

  async getYourResource(id: string): Promise<YourResponseType> {
    try {
      const res = await axiosInstance.get(`/your-endpoint/${id}`);
      return res.data?.data; // 2. Adjust based on the actual response structure
    } catch (error) {
      // 3. The error handler will format the error message
      throw new Error(handleAxiosError(error as any));
    }
  },

  // ... other methods
};
```

By following this structure, you ensure that all API calls benefit from the centralized token management and error handling provided by `axiosInstance`.

---

## 📈 Analytics (PostHog)

This project uses [PostHog](https://posthog.com/) for product analytics. The integration is already configured and provides valuable insights into user behavior.

### How to Use Analytics

While you can use `posthog-js` directly, we have created a custom hook `useAnalytics` for a more consistent and straightforward implementation.

To track a custom event, import and use the hook in your component:

```typescript
import { useAnalytics } from "@/hooks/useAnalytics";

function YourComponent() {
  const { capture } = useAnalytics();

  const handleButtonClick = () => {
    capture("your_event_name", {
      // Add any relevant properties
      property1: "value1",
    });
  };

  return <button onClick={handleButtonClick}>Track Event</button>;
}
```

### Key Tracked Events

The application already tracks critical user journey events, including:

- **Authentication**: `user_signed_in`, `signup_successful`, `logout_initiated`
- **Chat & Search**: `search_initiated`, `search_completed`, `agent_selected`

For a full list of events, refer to `POSTHOG_SETUP.md`.

### Viewing Analytics Data

Analytics data, funnels, and user behavior can be viewed on your [PostHog dashboard](https://app.posthog.com).

---

## 🏆 Engineering Practices for Scalability & Reliability

To ensure our codebase remains scalable,dont andd any kind of comments and remove all the console logs if getting added by AI ,reliable, and bug-free, we adhere to the following industry-standard practices:

- **Testing Strategy**:
  - **Unit & Integration Tests**: We use Jest and React Testing Library to test individual components and their interactions. All new features must be accompanied by meaningful tests.
  - **End-to-End (E2E) Tests**: Critical user flows are covered by E2E tests using Cypress or Playwright to prevent regressions.

- **Continuous Integration/Deployment (CI/CD)**:
  - A CI/CD pipeline (using GitHub Actions) automatically runs linting, testing, and builds on every pull request. Merging to `main` triggers a production deployment.

- **State Management Philosophy**:
  - **Global State (Redux)**: Used for data that is shared across many components (e.g., user authentication, profile data).
  - **Local State (`useState`, `useReducer`)**: Used for data that is specific to a single component or a small part of the component tree.

- **Code Reviews**:
  - All code must be submitted via a Pull Request (PR) and reviewed by at least one other developer before merging. This ensures code quality, knowledge sharing, and adherence to project standards.

- **Error Monitoring**:
  - We use Sentry for real-time error tracking and performance monitoring. The goal is to proactively identify and fix bugs before users report them.
