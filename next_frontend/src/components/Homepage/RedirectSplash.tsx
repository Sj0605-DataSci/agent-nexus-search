"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store";
import posthog from "posthog-js";
import { apiClient } from "@/integrations/fastapi/client";
import { fetchProfile } from "@/store/profileSlice";

export default function RedirectSplash() {
  const dark = useAppSelector(s => s.theme.dark);
  const router = useRouter();
  const ctrls = useAnimationControls();
  const dispatch = useAppDispatch();

  const RING_TIME = 1;
  const FADE_TIME = 0.35;

  useEffect(() => {
    ctrls.start({
      strokeDashoffset: 0,
      transition: { duration: RING_TIME, ease: "linear" },
    });
  }, [ctrls]);

  useEffect(() => {
    (async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("discover_minds_access_token") || null;
        if (token) {
          router.replace("/chat/new");
          const profileResult = await dispatch(fetchProfile()).unwrap();
          try {
            posthog.capture("profile_fetch_attempted", {
              source: "RedirectSplash",
              hasToken: true,
            });

            posthog.capture("profile_fetch_successful", {
              hasProfile: !!profileResult,
            });
          } catch (error) {
            console.error("Error fetching profile data:", error);

            posthog.capture("profile_fetch_error", {
              error: error instanceof Error ? error.message : String(error),
            });

            localStorage.removeItem("discover_minds_access_token");
            localStorage.removeItem("discover_minds_refresh_token");
          }
        } 
      }
    })();
  }, [dispatch, router]);

  const shellVariants = {
    enter: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { delay: RING_TIME, duration: FADE_TIME } },
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-300
        ${
          dark
            ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800 text-white"
            : "bg-gradient-to-br from-white via-gray-100 to-gray-200 text-gray-900"
        }`}
    >
      <motion.div
        initial="enter"
        animate="exit"
        variants={shellVariants}
        onAnimationComplete={() => router.replace("/join-waitlist")}
        className="flex flex-col items-center space-y-6"
      >
        <svg width="96" height="96" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={dark ? "#4f46e5" : "#3b82f6"}
            strokeWidth="8"
            strokeDasharray="330"
            strokeDashoffset="330"
            className="opacity-30"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={dark ? "#6366f1" : "#2563eb"}
            strokeWidth="8"
            strokeDasharray="330"
            strokeDashoffset="330"
            animate={ctrls}
          />
        </svg>

        <p aria-live="polite" className="text-lg sm:text-xl font-medium text-center leading-snug">
          Prepping something magical with&nbsp;
          <span className="font-semibold">DiscoverMinds.AI</span>…<br />
          almost there — we’ll take you to the waitlist in a blink 🚀
        </p>
      </motion.div>
    </div>
  );
}
