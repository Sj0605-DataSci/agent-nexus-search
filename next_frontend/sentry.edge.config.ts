// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Disable Sentry in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

Sentry.init({
  // Disable Sentry in development mode
  enabled: !isDevelopment,
  dsn: "https://b067ae5434d79345cb88f1aa7d0121b9@o4509668223287296.ingest.us.sentry.io/4509668224335872",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
