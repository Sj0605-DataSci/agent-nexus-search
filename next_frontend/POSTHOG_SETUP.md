# PostHog Analytics Setup

This document provides instructions on how to set up and use PostHog analytics in your DiscoverMinds application.

## Setup Instructions

1. **Add PostHog API Key to Environment Variables**

   Add the following variables to your `.env` file:

   ```
   NEXT_PUBLIC_POSTHOG_API_KEY=YOUR_PROJECT_API_KEY_HERE
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

   Replace `YOUR_PROJECT_API_KEY_HERE` with your actual PostHog project API key.

2. **PostHog is Already Integrated**

   The application is already set up with PostHog integration:
   
   - PostHog Provider is added to the app in `src/app/Providers.tsx`
   - Authentication events are tracked in `src/hooks/useAuth.tsx`
   - Chat and search events are tracked in `src/components/chats/ChatThreadView.tsx`

## Using Analytics in Your Components

### Track User Identity

When a user signs in, we automatically identify them using:

```typescript
import posthog from 'posthog-js';

// Identify a user
posthog.identify(userId, {
  email: userEmail,
  name: userName,
  // Add any other user properties
});
```

### Track Custom Events

To track custom events in your components:

```typescript
import posthog from 'posthog-js';

// Capture a custom event
posthog.capture('event_name', {
  // Add any properties relevant to the event
  property1: 'value1',
  property2: 'value2',
});
```

### Using the Analytics Hook

We've created a custom hook for easier analytics usage:

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function YourComponent() {
  const { capture, identify, reset } = useAnalytics();
  
  // Track an event
  capture('button_clicked', { buttonName: 'Submit' });
  
  // Identify a user
  identify(userId, { email, name });
  
  // Reset user identity (on logout)
  reset();
}
```

### Automatic Page View Tracking

To track page views in your layout or page components:

```typescript
import { usePageView } from '@/hooks/usePageView';

function YourPageComponent() {
  // This will automatically track page views
  usePageView();
  
  return (
    // Your component JSX
  );
}
```

## Events Being Tracked

The application currently tracks the following events:

### Authentication Events
- `user_signed_in`: When a user successfully signs in
- `signup_attempted`: When a user attempts to sign up
- `signup_successful`: When a user successfully signs up
- `signup_error`: When there's an error during signup
- `login_attempted`: When a user attempts to log in
- `login_error`: When there's an error during login
- `logout_initiated`: When a user initiates logout

### Chat/Search Events
- `chat_thread_viewed`: When a user views a chat thread
- `search_initiated`: When a user starts a search
- `search_completed`: When a search is completed
- `search_error`: When there's an error during search
- `search_mode_changed`: When a user changes search mode
- `world_connections_mode_changed`: When a user changes world connections mode
- `agent_selected`: When a user selects an agent
- `agent_marketplace_redirect`: When a user is redirected to the marketplace

## Viewing Analytics Data

Visit your PostHog dashboard at https://app.posthog.com to view analytics data, create funnels, and analyze user behavior.
