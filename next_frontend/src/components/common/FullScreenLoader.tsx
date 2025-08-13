"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";

interface FullScreenLoaderProps {
  isLoading: boolean;
  label?: string;
}

const containerVariants: Variants = {
  enter: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const spinnerVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      type: "tween" as const,
      duration: 1.2,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  },
};

const FACTS = [
  "The average person has about 27,000 days in their lifetime. Make each connection count.",
  "Strong professional networks are linked to higher job satisfaction and career success.",
  "85% of jobs are filled through networking, according to LinkedIn.",
  "The 'strength of weak ties' theory shows that new opportunities often come from casual connections.",
  "The human brain can maintain about 150 stable relationships, known as Dunbar's number.",
  "People who regularly engage with their professional network are 7x more likely to receive job referrals.",
  "The best time to build your network is before you need it. Start connecting today!",
  "Recruiters report that 80% of jobs are never advertised, but filled through networking.",
  "A diverse network can increase your creativity and problem-solving abilities by 50%.",
  "It takes 3-5 touchpoints to build a meaningful professional relationship.",
];

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ isLoading, label = "Loading..." }) => {
  const [currentFact, setCurrentFact] = useState("");

  useEffect(() => {
    if (!isLoading) return;

    // Set initial fact
    setCurrentFact(FACTS[Math.floor(Math.random() * FACTS.length)]);

    // Rotate facts every 5 seconds
    const interval = setInterval(() => {
      setCurrentFact(prev => {
        let nextFact;
        do {
          nextFact = FACTS[Math.floor(Math.random() * FACTS.length)];
        } while (nextFact === prev && FACTS.length > 1);
        return nextFact;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          variants={containerVariants}
          initial="enter"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90"
        >
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ scale: 0.95 }}
            animate={{
              scale: [0.95, 1, 0.95],
              transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          >
            <motion.div
              className="absolute h-20 w-20 rounded-full bg-indigo-100"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.span
              variants={spinnerVariants}
              initial="initial"
              animate="animate"
              className="relative z-10 text-indigo-600"
            >
              <Loader2 className="h-12 w-12" />
            </motion.span>
          </motion.div>

          <motion.p
            className="mt-6 text-gray-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.1 },
            }}
          >
            {label}
          </motion.p>

          <motion.div
            key={currentFact}
            className="mt-8 max-w-md px-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.3 },
            }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="text-sm text-gray-500 italic before:content-['“'] after:content-['”']">
              {currentFact}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenLoader;
