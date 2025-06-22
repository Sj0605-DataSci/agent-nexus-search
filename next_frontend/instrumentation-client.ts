"use client";

import posthog from "posthog-js";

posthog.init("phc_jVMr4nW9RU6aaIF5W4MIZGBiayFC9NtAXTk9WiUEyHN", {
  api_host: "https://us.posthog.com",
  capture_pageview: "history_change",
  capture_pageleave: true,
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});
