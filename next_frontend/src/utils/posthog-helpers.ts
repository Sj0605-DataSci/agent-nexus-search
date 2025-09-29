import posthog from "posthog-js";
import { UserProfile as Profile } from "@/integrations/fastapi/types";
import { User } from "@supabase/supabase-js";

/**
 * Identifies the user in PostHog and sets their properties.
 * This should be the single source of truth for user identification.
 */
export const identifyPostHogUser = (user: User | null, profile: Profile | null) => {
  if (profile?.id) {
    posthog.identify(profile.id, {
      email: profile.email,
      name: profile.full_name,
      $email: profile.email,
      $name: profile.full_name,
      user_type: "authenticated",
      auth_status: "signed_in",
    });
  } else if (user?.id) {
    posthog.identify(user.id, {
      email: user.email,
      name: user.user_metadata?.full_name,
      $email: user.email,
      $name: user.user_metadata?.full_name,
      signUpDate: user.created_at,
      user_type: "authenticated",
      auth_status: "signed_in",
    });
  } else {
    // Not enough info to identify, handle as guest
    setPostHogGuest();
  }
};

/**
 * Resets PostHog identification and sets properties for a guest user.
 */
export const setPostHogGuest = () => {
  posthog.reset();
  const anonymousId = posthog.get_distinct_id();
  posthog.register({
    is_guest: true,
    user_type: "guest",
    auth_status: "anonymous",
  });
  posthog.people.set({
    $name: `Guest User (${anonymousId?.substring(0, 8) ?? "new"})`,
    user_type: "guest",
    auth_status: "anonymous",
    first_seen_at: new Date().toISOString(),
  });
  posthog.capture("guest_session_start");
};

/**
 * Updates PostHog user properties.
 * This should be used for all dynamic property updates.
 */
export const updatePostHogUserProperties = (properties: Record<string, any>) => {
  posthog.people.set(properties);
};
