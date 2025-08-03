"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Loader2 } from "lucide-react";
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
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          variants={bgVariants}
          initial="enter"
          animate="animate"
          exit="exit"
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white`}
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
              className={`absolute inset-0 rounded-full blur-xl bg-gradient-to-tr from-blue-400/40 via-indigo-400/40 to-purple-400/40`}
            />
            <motion.span
              variants={spinnerVariants}
              initial="enter"
              animate="animate"
              className={"text-indigo-600"}
            >
              <Loader2 className="h-16 w-16" />
            </motion.span>
          </motion.div>

          <p className={`mt-6 text-lg font-medium tracking-wide text-gray-700`}>{label}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenLoader;
