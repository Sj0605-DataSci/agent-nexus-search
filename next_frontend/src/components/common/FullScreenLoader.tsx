"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAppSelector } from "@/store";
import React from "react";

interface FullScreenLoaderProps {
  isLoading: boolean;
  label?: string;
}

const spinnerVariants: Variants = {
  enter: { rotate: 0, opacity: 0 },
  animate: {
    rotate: 360,
    opacity: 1,
    transition: {
      type: "tween", 
      duration: 1.2,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

const bgVariants: Variants = {
  enter: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, type: "tween" } },
  exit: { opacity: 0, transition: { duration: 0.25, type: "tween" } },
};


const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ isLoading, label = "Loading…" }) => {
  const dark = useAppSelector(s => s.theme.dark);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          variants={bgVariants}
          initial="enter"
          animate="animate"
          exit="exit"
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${
            dark ? "bg-gray-950" : "bg-white"
          }`}
        >
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: [0.9, 1, 0.9],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              type: "tween",
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <div
              className={`absolute inset-0 rounded-full blur-xl ${
                dark
                  ? "bg-gradient-to-tr from-blue-600/40 via-indigo-500/40 to-purple-500/40"
                  : "bg-gradient-to-tr from-blue-400/40 via-indigo-400/40 to-purple-400/40"
              }`}
            />
            <motion.span
              variants={spinnerVariants}
              initial="enter"
              animate="animate"
              className={dark ? "text-indigo-300" : "text-indigo-600"}
            >
              <Loader2 className="h-16 w-16" />
            </motion.span>
          </motion.div>

          <p
            className={`mt-6 text-lg font-medium tracking-wide ${
              dark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {label}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenLoader;
