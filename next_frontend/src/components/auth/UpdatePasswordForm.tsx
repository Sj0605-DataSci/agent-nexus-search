"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaLock, FaEye, FaEyeSlash, FaCheck } from "react-icons/fa";
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

export default function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [error, setError] = useState("");
  const darkMode = false;

  useEffect(() => {
    // Extract tokens from URL hash (Supabase format)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const error_description = params.get("error_description");

      if (error_description) {
        setError(error_description);
        showErrorToast("Invalid or expired reset link");
        return;
      }

      if (access_token && refresh_token) {
        setAccessToken(access_token);
        setRefreshToken(refresh_token);
      } else {
        setError("Missing authentication tokens");
        showErrorToast("Invalid reset link. Please request a new password reset.");
      }
    } else {
      setError("No authentication tokens found");
      showErrorToast("Invalid reset link. Please request a new password reset.");
    }
  }, []);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!accessToken || !refreshToken) {
        showErrorToast("Authentication tokens missing. Please request a new password reset.");
        return;
      }

      if (password !== confirmPassword) {
        showErrorToast("Passwords do not match");
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        showErrorToast(passwordError);
        return;
      }

      setLoading(true);

      try {
        posthog.capture("password_update_attempted");

        const result = await apiClient.updatePassword(password, accessToken, refreshToken);
        
        if (result.success) {
          setPasswordUpdated(true);
          showSuccessToast("Password updated successfully! You can now log in with your new password.");
          posthog.capture("password_update_success");
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          showErrorToast(result.message || "Failed to update password");
          posthog.capture("password_update_failed", { error: result.message });
        }
      } catch (error: any) {
        console.error("Update password error:", error);
        showErrorToast(error.message || "An error occurred while updating password");
        posthog.capture("password_update_error", { error: error.message });
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, accessToken, refreshToken, router]
  );

  if (error) {
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
              <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                Invalid Reset Link
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This password reset link is invalid or has expired.
              </p>
              
              <Link
                href="/reset-password"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Request New Reset Link
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (passwordUpdated) {
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
              <div className="mx-auto mb-6 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <FaCheck className="text-green-600 dark:text-green-400 text-2xl" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Password Updated!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your password has been successfully updated. You will be redirected to the login page shortly.
              </p>
              
              <Link
                href="/login"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Go to Login
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
              Update Password
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </Label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="pl-10 pr-10 h-12 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className={password.length >= 8 ? "text-green-600" : ""}>
                  • At least 8 characters
                </p>
                <p className={/(?=.*[a-z])/.test(password) ? "text-green-600" : ""}>
                  • One lowercase letter
                </p>
                <p className={/(?=.*[A-Z])/.test(password) ? "text-green-600" : ""}>
                  • One uppercase letter
                </p>
                <p className={/(?=.*\d)/.test(password) ? "text-green-600" : ""}>
                  • One number
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </Label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="pl-10 pr-10 h-12 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading || !password.trim() || !confirmPassword.trim() || password !== confirmPassword || !accessToken}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed h-12 flex items-center justify-center"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                "Update Password"
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
