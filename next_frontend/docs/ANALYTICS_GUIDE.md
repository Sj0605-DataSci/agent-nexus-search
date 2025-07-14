# PostHog Analytics Implementation Guide

This guide explains how to use the PostHog analytics implementation in your DiscoverMinds application.

## Table of Contents

1. [Setup](#setup)
2. [Tracking User Identity](#tracking-user-identity)
3. [Tracking Events](#tracking-events)
4. [Available Methods](#available-methods)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Setup

To use PostHog analytics in your application, you need to:

1. Add your PostHog API key to your `.env` file:

```
NEXT_PUBLIC_POSTHOG_API_KEY=YOUR_PROJECT_API_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

2. The PostHog integration is already set up in your application:
   - `PostHogProvider` is added to your app in `src/app/Providers.tsx`
   - `AnalyticsProvider` tracks page views automatically
   - Authentication events are tracked in `src/hooks/useAuth.tsx`
   - Chat and search events are tracked in `src/components/chats/ChatThreadView.tsx`

## Tracking User Identity

When a user signs in, we automatically identify them in PostHog. This is handled in the `useAuth.tsx` hook.

If you need to identify a user manually:

```typescript
import posthog from 'posthog-js';

// Identify a user
posthog.identify(userId, {
  email: userEmail,
  name: userName,
  // Add any other user properties
});
```

Or use the `useAnalytics` hook:

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

const { identify } = useAnalytics();
identify(userId, { email, name });
```

## Tracking Events

There are multiple ways to track events in your application:

### 1. Using the `useAnalytics` Hook

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function YourComponent() {
  const { capture } = useAnalytics();
  
  const handleClick = () => {
    capture('button_clicked', { buttonName: 'Submit' });
  };
  
  return <button onClick={handleClick}>Submit</button>;
}
```

### 2. Using the Analytics Utility

```typescript
import Analytics from '@/utils/analytics';

function YourComponent() {
  const handleButtonClick = () => {
    Analytics.trackButtonClick('submit_button', { page: 'checkout' });
  };
  
  const handleError = (error) => {
    Analytics.trackError('api_error', error.message, { endpoint: '/api/data' });
  };
  
  return <button onClick={handleButtonClick}>Submit</button>;
}
```

### 3. Using the TrackEvent Component

```typescript
import { TrackEvent } from '@/components/analytics/TrackEvent';
import { Button } from '@/components/ui/button';

function YourComponent() {
  return (
    <TrackEvent eventName="share_clicked" properties={{ method: 'button' }}>
      <Button>Share</Button>
    </TrackEvent>
  );
}
```

### 4. Using PostHog Directly

```typescript
import posthog from 'posthog-js';

function YourComponent() {
  const handleAction = () => {
    posthog.capture('user_action', {
      action_type: 'download',
      file_name: 'report.pdf'
    });
  };
  
  return <button onClick={handleAction}>Download</button>;
}
```

## Available Methods

### From useAnalytics Hook

- `identify(userId, properties)`: Identify a user
- `capture(eventName, properties)`: Track an event
- `reset()`: Reset user identity (use when logging out)

### From Analytics Utility

- `trackFeatureUsage(featureName, properties)`: Track feature usage
- `trackError(errorType, errorMessage, properties)`: Track errors
- `trackButtonClick(buttonName, properties)`: Track button clicks
- `trackFormSubmission(formName, properties)`: Track form submissions
- `trackPreferenceChange(preferenceName, newValue, oldValue)`: Track preference changes
- `trackContentView(contentType, contentId, properties)`: Track content views
- `trackShare(contentType, contentId, shareMethod, properties)`: Track sharing
- `trackSearch(query, resultsCount, properties)`: Track searches
- `setUserProperties(properties)`: Set persistent user properties
- `incrementUserProperty(property, value)`: Increment a user property

## Best Practices

1. **Be Consistent with Event Names**: Use a consistent naming convention for events (e.g., `noun_verb` like `button_clicked` or `form_submitted`).

2. **Include Relevant Properties**: Add properties that provide context to events, but avoid including sensitive information.

3. **Track Important User Actions**: Focus on tracking actions that are important for understanding user behavior and improving your application.

4. **Use the Right Method**: Choose the appropriate method based on your use case:
   - Use `TrackEvent` for simple UI interactions
   - Use `Analytics` utility for standardized events
   - Use `useAnalytics` hook in functional components
   - Use direct `posthog` calls for custom needs

5. **Group Related Events**: Use a consistent prefix for related events (e.g., `search_initiated`, `search_completed`).

## Examples

### Tracking a Multi-Step Process

```typescript
// Step 1: User starts the process
Analytics.trackFeatureUsage('onboarding_started', { entry_point: 'homepage' });

// Step 2: User completes a form
Analytics.trackFormSubmission('onboarding_profile_form', { 
  fields_completed: 5,
  time_spent_seconds: 120
});

// Step 3: User completes the process
Analytics.trackFeatureUsage('onboarding_completed', { 
  total_time_seconds: 300,
  steps_completed: 3
});
```

### Tracking User Engagement

```typescript
// Track when a user views content
Analytics.trackContentView('article', articleId, { 
  category: article.category,
  author: article.author
});

// Track when a user shares content
Analytics.trackShare('article', articleId, 'twitter', { 
  title: article.title
});

// Track when a user interacts with content
posthog.capture('article_interaction', {
  article_id: articleId,
  interaction_type: 'comment',
  comment_length: commentText.length
});
```

### Tracking Error Rates

```typescript
try {
  // Your code here
} catch (error) {
  // Log the error
  console.error('Error:', error);
  
  // Track the error in PostHog
  Analytics.trackError(
    'api_error', 
    error.message, 
    { 
      endpoint: '/api/data',
      status_code: error.status || 500,
      request_id: requestId
    }
  );
}
```

For more examples, see the `AnalyticsExample.tsx` component in the `src/components/examples` directory.
