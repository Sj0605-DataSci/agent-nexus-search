// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Disable Sentry in development mode or on localhost
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  // Disable Sentry in development mode or on localhost
  enabled: !(isLocalhost || isDevelopment),
  dsn: "https://b067ae5434d79345cb88f1aa7d0121b9@o4509668223287296.ingest.us.sentry.io/4509668224335872",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Session replay is enabled by default in the Sentry NextJS SDK
  // No need to explicitly add the Replay integration
});
