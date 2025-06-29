"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { useAppSelector } from "@/store";

const RedirectSplash = () => {
  const router = useRouter();
  const dark = useAppSelector(s => s.theme.dark);
  const timerId = useRef<NodeJS.Timeout | undefined>(undefined);
  const ctrls = useAnimation();

  const DELAY = 1000;

  useEffect(() => {
    ctrls.start({
      strokeDashoffset: 0,
      transition: { duration: DELAY / 1000, ease: "linear" },
    });

    timerId.current = setTimeout(async () => {
      await ctrls.start({
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.35 },
      });
      router.replace("/join-waitlist");
    }, DELAY - 10);

    return () => clearTimeout(timerId.current);
  }, [router, ctrls]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center
        transition-colors duration-300 ${
          dark
            ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800 text-white"
            : "bg-gradient-to-br from-white via-gray-100 to-gray-200 text-gray-900"
        }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
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
            strokeLinecap="round"
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
            strokeLinecap="round"
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
};

export default RedirectSplash;
