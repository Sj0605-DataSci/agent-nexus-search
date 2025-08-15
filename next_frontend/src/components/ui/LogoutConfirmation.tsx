"use client";

import { FiAlertTriangle, FiLogOut } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface LogoutConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLoggingOut: boolean;
  isOpen: boolean;
}

export const LogoutConfirmation = ({
  onConfirm,
  onCancel,
  isLoggingOut,
  isOpen,
}: LogoutConfirmationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onCancel, 200);
  };

  if (!isOpen && !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-50 mb-6"
            >
              <FiAlertTriangle className="h-7 w-7 text-amber-500" />
            </motion.div>

            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xl font-semibold text-gray-900 mb-3"
            >
              Ready to sign out?
            </motion.h3>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-500 mb-7 text-sm leading-relaxed"
            >
              You'll be signed out of your account. Make sure to save any unsaved changes before
              proceeding.
            </motion.p>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-col sm:flex-row justify-center gap-3"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoggingOut}
                className="sm:w-auto border-0 text-gray-50 min-w-[130px] px-6 py-3 text-sm font-medium transition-colors  bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] hover:bg-gray-50"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={onConfirm}
                disabled={isLoggingOut}
                className="w-full sm:w-auto px-6 py-3 border-1 text-sm font-medium min-w-[120px] relative overflow-hidden group"
              >
                {isLoggingOut ? (
                  <span className="flex items-center justify-center">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Signing out...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <FiLogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </span>
                )}
                {isLoggingOut && (
                  <motion.span
                    className="absolute inset-0 bg-black/10"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
