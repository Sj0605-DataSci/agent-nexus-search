"use client";

import { useEffect } from "react";
import * as serviceWorkerRegistration from "@/utils/serviceWorkerRegistration";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register the service worker
    serviceWorkerRegistration.register({
      onSuccess: registration => {
        console.log("ServiceWorker registration successful with scope: ", registration.scope);
      },
      onUpdate: registration => {
        console.log("New content is available; please refresh.");
        // You can show a notification to the user here
      },
    });
  }, []);

  return null; // This component doesn't render anything
}
