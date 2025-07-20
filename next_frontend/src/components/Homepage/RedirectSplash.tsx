"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { useAppSelector } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import { UserProfile } from "@/integrations/fastapi/types";
import posthog from "posthog-js";

export default function RedirectSplash() {
  const dark = useAppSelector(s => s.theme.dark);
  const router = useRouter();
  const ctrls = useAnimationControls();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const RING_TIME = 1;
  const FADE_TIME = 0.35;

  useEffect(() => {
    const fetchProfileData = async () => {
      const token = localStorage.getItem("discover_minds_access_token");
      
      if (token && !profile) {
        setLoading(true);
        try {
          posthog.capture("profile_fetch_attempted", {
            source: "RedirectSplash",
            hasToken: true,
          });

          const profileData = await apiClient.fetchProfileFromAPI();
          setProfile(profileData);

          posthog.capture("profile_fetch_successful", {
            hasProfile: !!profileData,
          });
        } catch (error) {
          console.error("Error fetching profile data:", error);

          posthog.capture("profile_fetch_error", {
            error: error instanceof Error ? error.message : String(error),
          });

          // Token is invalid, clear and redirect to login
          localStorage.removeItem("discover_minds_access_token");
          localStorage.removeItem("discover_minds_refresh_token");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfileData();
  }, [profile]);

  useEffect(() => {
    ctrls.start({
      strokeDashoffset: 0,
      transition: { duration: RING_TIME, ease: "linear" },
    });
  }, [ctrls]);

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
        onAnimationComplete={() => {
          const token = localStorage.getItem("discover_minds_access_token");
          if (token && profile) {
            router.replace("/chat");
          } else {
            router.replace("/join-waitlist");
          }
        }}
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
