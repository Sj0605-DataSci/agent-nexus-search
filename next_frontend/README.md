# Discoverminds.ai — Deep Search for People

> A search engine that evolves with you. One that understands your intent, learns from your feedback, and helps you discover people: naturally and intelligently.

**Discoverminds.ai** is the first context-aware, agent-powered search engine for people, built for HR, sales, recruiting, founders, and anyone who needs to find the right person, fast.

---

## ✨ Key Features

- **🧠 Personalised Agents**: Trained to understand your goals and adapt to your query patterns.
- **🗣️ Natural Language Search**: No filters. No menus. Just plain language. Example: _“Find backend engineers in Berlin with fintech experience and public emails.”_
- **🤝 Connections Search**: Connect your social media accounts to find people using natural language.
- **📝 Chat/Excel Mode**: Get results in a chat-like interface or as an Excel sheet delivered to your email.
- **🔄 Evolving Context**: Every query builds on the last, learning what works and improving over time.
- **🧬 Semantic Understanding**: Deep language models parse intent, not just keywords.

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

To ensure our codebase remains scalable, reliable, and bug-free, we adhere to the following industry-standard practices:

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
