// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Disable Sentry in development mode
const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  // Disable Sentry in development mode
  enabled: !isDevelopment,
  dsn: "https://b067ae5434d79345cb88f1aa7d0121b9@o4509668223287296.ingest.us.sentry.io/4509668224335872",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
