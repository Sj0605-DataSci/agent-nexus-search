"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import AuthBrandingPanel from "@/components/auth/AuthBrandingPanel";
import NewAnimatedWaitlist from "@/components/NewAnimatedWaitlist";

const formVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export default function Waitlist() {
  const router = useRouter();
  const [formToShow, setFormToShow] = useState("signin");

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 h-screen">
        <div className="flex justify-center items-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            <BrandLogo size="large" showCrossIcon={true} />
            {/* <div className="relative flex justify-between items-center mb-8">
              <button
                onClick={() => router.push("/")}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div> */}

            <AnimatePresence mode="wait">
              <motion.div
                key={formToShow}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <NewAnimatedWaitlist />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <AuthBrandingPanel />
      </div>
    </div>
  );
}
