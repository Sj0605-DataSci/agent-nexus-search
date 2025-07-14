"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import Analytics from "@/utils/analytics";

/**
 * Example component demonstrating different ways to use PostHog analytics
 */
export default function AnalyticsExample() {
  const [count, setCount] = useState(0);
  const { capture } = useAnalytics();

  // Example of tracking a button click
  const handleButtonClick = () => {
    setCount(count + 1);

    // Method 1: Using the useAnalytics hook
    capture("button_clicked", {
      button_name: "increment",
      current_count: count,
    });
  };

  // Example of tracking a form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Method 2: Using the Analytics utility
    Analytics.trackFormSubmission("example_form", {
      submitted_at: new Date().toISOString(),
    });

    // You could also track a feature usage
    Analytics.trackFeatureUsage("form_submission");
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-6 mt-10">
      <h2 className="text-2xl font-bold text-gray-900">Analytics Examples</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Method 1: Direct Hook Usage</h3>
          <p className="text-gray-500 mb-2">Using the useAnalytics hook</p>
          <Button onClick={handleButtonClick}>Increment Count: {count}</Button>
        </div>

        <div>
          <h3 className="text-lg font-medium">Method 2: Analytics Utility</h3>
          <p className="text-gray-500 mb-2">Using the Analytics utility functions</p>
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="Enter some text"
              className="px-4 py-2 border rounded w-full"
              onChange={e => {
                if (e.target.value.length > 5) {
                  // Track when user types more than 5 characters
                  Analytics.trackFeatureUsage("text_input", {
                    length: e.target.value.length,
                  });
                }
              }}
            />
            <Button type="submit">Submit Form</Button>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-medium">Method 3: TrackEvent Component</h3>
          <p className="text-gray-500 mb-2">Using the TrackEvent component wrapper</p>
          <TrackEvent
            eventName="share_clicked"
            properties={{ method: "button", content_type: "example" }}
          >
            <Button variant="outline">Share Content</Button>
          </TrackEvent>
        </div>

        <div>
          <h3 className="text-lg font-medium">Method 4: Direct PostHog Usage</h3>
          <p className="text-gray-500 mb-2">Using posthog directly (import from posthog-js)</p>
          <Button
            variant="secondary"
            onClick={() => {
              // Import posthog directly in your component
              import("posthog-js").then(module => {
                const posthog = module.default;
                posthog.capture("direct_posthog_event", {
                  timestamp: Date.now(),
                });
              });
            }}
          >
            Direct PostHog Event
          </Button>
        </div>
      </div>
    </div>
  );
}
