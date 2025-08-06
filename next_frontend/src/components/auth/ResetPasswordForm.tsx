"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import BrandLogo from "@/components/BrandLogo";
import { motion, Variants } from "framer-motion";
import posthog from "posthog-js";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import Aurora from "@/components/Aurora";
import { apiClient } from "@/integrations/fastapi/client";

const backdropVariants: Variants = {
  animate: {
    rotate: [0, 15, -10, 0],
    scale: [1, 1.05, 0.98, 1],
    transition: {
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut",
      repeatType: "loop",
    },
  },
};

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const darkMode = false;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        posthog.capture("password_reset_requested", { email });

        // Use the current domain for redirect URL
        const redirectUrl = `${window.location.origin}/update-password`;
        
        const result = await apiClient.resetPassword(email, redirectUrl);
        
        if (result.success) {
          setEmailSent(true);
          showSuccessToast("Password reset email sent! Please check your inbox.");
          posthog.capture("password_reset_email_sent", { email });
        } else {
          showErrorToast(result.message || "Failed to send reset email");
          posthog.capture("password_reset_failed", { email, error: result.message });
        }
      } catch (error: any) {
        console.error("Reset password error:", error);
        showErrorToast(error.message || "An error occurred while sending reset email");
        posthog.capture("password_reset_error", { email, error: error.message });
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
        <Aurora />
        <motion.div
          className="absolute inset-0 opacity-30"
          variants={backdropVariants}
          animate="animate"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl" />
        </motion.div>

        <div className="relative z-10 w-full max-w-md p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <BrandLogo className="mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Check Your Email
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Try again
              </button>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaArrowLeft className="mr-2" />
                Back to login
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
      <Aurora />
      <motion.div
        className="absolute inset-0 opacity-30"
        variants={backdropVariants}
        animate="animate"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl" />
      </motion.div>

      <div className="relative z-10 w-full max-w-md p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <BrandLogo className="mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Reset Password
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </Label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="pl-10 h-12 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed h-12 flex items-center justify-center"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                "Send Reset Link"
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaArrowLeft className="mr-2" />
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
