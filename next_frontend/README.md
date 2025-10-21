# 🔍 DiscoverMinds.ai

## 1. Introduction

**Product Name:** DiscoverMinds.ai

**Purpose:** Your secret weapon for professional networking - turn your network into your competitive advantage by facilitating warm introductions and addressing the fragmentation of existing professional networks.

**Target Users:** Professionals, entrepreneurs, VCs, communities, and working professionals ("prosumers").

---

## 2. Problem Statement

- Professional networks are fragmented across multiple platforms (LinkedIn, Twitter, personal contacts), limiting opportunities.
- 70-85% of jobs are filled through referrals and hidden markets, which are hard to access.
- Cold outreach is ineffective (2-20% response rates, highly time-intensive, low trust).
- Trust barriers prevent meaningful network sharing and mutual introductions.

---

## 3. Solution Overview

A mutual network-sharing platform with consent-based discovery to help users find opportunities in their extended networks.

---

## 4. Key Features & Functionality

DiscoverMinds.ai is more than a search tool; it's a complete system for network intelligence.

### **Unified Contact Hub: Import & Integrate**

- **One-Click Sync**: Seamlessly import and sync contacts from all your professional platforms—LinkedIn, Twitter, Gmail, and even your phone's contact list.
- **Centralized View**: See all your connections in one place, eliminating the need to switch between apps and creating a single source of truth for your professional network.

### **Consent-Based Mutual Sharing**

- **Build Your Inner Circle**: Invite trusted friends and colleagues to a mutual network-sharing group where you can grant access to each other's connections.
- **Reciprocal Value**: It's a two-way street. You give access, you get access. This creates a powerful, shared pool of opportunities that benefits everyone involved.

### **AI-Powered Smart Search**

- **Natural Language Queries**: Forget complicated filters. Just ask what you need in plain English: _"Find me a software engineer in London who has worked at Google and is in my 2nd-degree network."_
- **Context-Aware Matching**: Our AI doesn't just match keywords; it understands your intent, surfacing the most relevant people and opportunities based on relationship strength and context.
- **Proactive Suggestions**: DiscoverMinds.ai learns from your activity and proactively suggests new connections and opportunities you might have missed.

### **Streamlined Warm Introductions**

- **Visualize the Path**: Instantly see the shortest and strongest referral path to any person in your extended network. No more guessing who knows whom.
- **Trackable Requests**: Request and manage introductions through a built-in tracking system. See the status of every request and follow up with ease.

### **Privacy-First by Design**

- **You Own Your Data**: Your data is yours. Period. You have full control over what you share and who can see it.
- **Granular Permissions**: Decide exactly which contacts or network segments you want to share with your trusted circle. All sharing is opt-in and can be revoked at any time.
- **Double Opt-In Introductions**: Introductions only happen when both parties agree, ensuring that all connections are welcome and respectful of everyone's time.

---

## 5. User Stories (Examples)

- **As a job seeker,** I want to find hidden job opportunities through warm introductions within my extended network so I can bypass cold outreach and increase my chances of getting hired.
- **As an entrepreneur,** I want to connect with relevant VCs or mentors through trusted introductions so I can secure funding or guidance more effectively.
- **As a business development manager,** I want to identify and get warm introductions to potential clients in my target industry so I can build stronger relationships and improve conversion rates.
- **As a user,** I want to control who can see my network and who I get introduced to, ensuring my data privacy and trust.

---

## 6. Business Model

### Hunter Plan (Free)

- Access to DiscoverMinds Search.

### Pro Plan (₹225/month)

- Unlimited Searches Per Month
- Unlimited Connected Accounts
- Slack Integrations
- Unlimited Friends And Unlimited Groups
- Unlimited Results Per Search
- Export Search Results To CSV
- Forward Emails To Agent@DiscoverMinds.Ai
- AI icebreaker suggestions and unlimited warm intros

---

## 7. Growth Strategy (High-Level)

- **Direct Outreach** to entrepreneur/VC communities and alumni networks.
- **Viral Invitation Loop:** Growth accelerates as friends and colleagues join.
- **Partnership Strategy:** Integrations with recruiting firms, accelerators, ecosystem partners.
- **Content Marketing:** Share success stories and best practices.

---

## 8. Key Metrics for Success (KPIs)

- User growth
- Network density
- Successful introductions (conversion rate)
- User retention
- Number of Pro Plan users
- Annual Recurring Revenue (ARR)

---

## 9. Milestones (Near-term, Next 6-12 Months)

- MVP launch with 500-1,000 active users.
- First enterprise/community partnerships.
- Viral referral loop: 3-5X user growth through team invites.
- Integrations with Slack, Discord, WhatsApp, and CRMs.
- Achieve 30%+ intro conversion rate.
- Secure 1000+ Pro Plan users.
- Reach $250K+ ARR from paying customers.
- Raise Seed round ($3-5M) for scale.

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
