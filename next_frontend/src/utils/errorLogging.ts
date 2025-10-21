import { ErrorInfo } from "react";
import posthog from "posthog-js";

export const logError = (error: Error, info: ErrorInfo) => {
  console.error("Error caught by ErrorBoundary:", error);
  console.error("Component stack:", info.componentStack);

  if (process.env.NODE_ENV === "production") {
    try {
      posthog.capture("error_boundary_triggered", {
        error_message: error.message,
        error_name: error.name,
        error_stack: error.stack,
        component_stack: info.componentStack,
      });
    } catch (logError) {
      console.error("Failed to log error to PostHog:", logError);
    }
  }
};
