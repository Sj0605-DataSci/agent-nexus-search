"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaArrowLeft, FaSpinner } from "react-icons/fa";
import BrandLogo from "@/components/BrandLogo";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import Aurora from "@/components/Aurora";
import { apiClient } from "@/integrations/fastapi/client";

const validatePassword = (value: string) => {
  if (!value) return "Password is required";
  if (value.length < 8) return "Must be at least 8 characters";
  if (!/(?=.*[a-z])/.test(value)) return "Must contain a lowercase letter";
  if (!/(?=.*[A-Z])/.test(value)) return "Must contain an uppercase letter";
  if (!/(?=.*\d)/.test(value)) return "Must contain a number";
  return "";
};

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isValidatingToken, setIsValidatingToken] = useState(true);

  useEffect(() => {
    const validateAndSetTokens = async () => {
      const hash = window.location.hash;
      const search = window.location.search;

      try {
        const urlParams = new URLSearchParams(search);
        const errorParam = urlParams.get("error");

        if (errorParam) {
          const errorDescription =
            urlParams.get("error_description") || "Invalid or expired reset link";
          setError(errorDescription);
          showErrorToast(errorDescription);
          setIsValidatingToken(false);
          return;
        }

        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const error_description = params.get("error_description");

          if (error_description) {
            setError(error_description);
            showErrorToast("Invalid or expired reset link");
            setIsValidatingToken(false);
            return;
          }

          if (access_token && refresh_token) {
            try {
              setAccessToken(access_token);
              setRefreshToken(refresh_token);
            } catch (err) {
              console.error("Token validation error:", err);
              setError("Invalid or expired reset link");
              showErrorToast("This password reset link has expired. Please request a new one.");
            }
          } else {
            setError("Missing authentication tokens");
            showErrorToast("Invalid reset link. Please request a new password reset.");
          }
        } else {
          setError("No reset token found");
          showErrorToast("Invalid reset link. Please check the URL or request a new one.");
        }
      } catch (err) {
        console.error("Error processing reset link:", err);
        setError("An error occurred while processing your request");
        showErrorToast("An error occurred. Please try again.");
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateAndSetTokens();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!accessToken || !refreshToken) {
        showErrorToast("Invalid reset link. Please request a new one.");
        return;
      }

      const passwordValidation = validatePassword(password);
      if (passwordValidation) {
        setPasswordError(passwordValidation);
        return;
      }

      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return;
      }

      setLoading(true);
      setPasswordError("");

      try {
        posthog.capture("password_update_attempted");
        const result = await apiClient.updatePassword(password, accessToken, refreshToken);

        if (result.success) {
          setPasswordUpdated(true);
          showSuccessToast(
            "Password updated successfully! You can now log in with your new password."
          );
          posthog.capture("password_update_success");

          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          throw new Error(result.message || "Failed to update password");
        }
      } catch (error: any) {
        console.error("Update password error:", error);
        const errorMessage = error.message || "An error occurred while updating password";
        setPasswordError(errorMessage);
        showErrorToast(errorMessage);
        posthog.capture("password_update_error", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, accessToken, refreshToken, router]
  );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="absolute top-0 left-0 z-0 w-full h-[30vh] min-h-[280px] opacity-0">
          <Aurora
            colorStops={["#5227ff", "#7cff67", "#5227ff"]}
            blend={0.5}
            amplitude={1.0}
            speed={0.5}
          />
        </div>

        <div className="relative w-full max-w-md mx-2 p-8 sm:p-10 rounded-3xl shadow-2xl bg-white/90 border border-white/20 backdrop-blur-md">
          <div className="text-center">
            <BrandLogo className="mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-8">
              This password reset link is invalid or has expired.
            </p>

            <Link
              href="/reset-password"
              className="inline-block bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 hover:from-blue-600 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Request New Reset Link
            </Link>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft className="mr-2" />
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="absolute top-0 left-0 z-0 w-full h-[30vh] min-h-[280px] opacity-0">
          <Aurora
            colorStops={["#5227ff", "#7cff67", "#5227ff"]}
            blend={0.5}
            amplitude={1.0}
            speed={0.5}
          />
        </div>

        <div className="relative w-full max-w-md mx-2 p-8 sm:p-10 rounded-3xl shadow-2xl bg-white/90 border border-white/20 backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <FaCheck className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
            <p className="text-gray-600 mb-8">
              Your password has been successfully updated. You will be redirected to the login page
              shortly.
            </p>

            <Link
              href="/login"
              className="inline-block bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 hover:from-blue-600 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="absolute top-0 left-0 z-0 w-full h-[30vh] min-h-[280px] opacity-0">
        <Aurora
          colorStops={["#5227ff", "#7cff67", "#5227ff"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      <div className="relative w-full max-w-md mx-2 p-8 sm:p-10 rounded-3xl shadow-2xl bg-white/90 border border-white/20 backdrop-blur-md">
        <div className="mb-6">
          <BrandLogo className="mb-3" />
          <p className="text-gray-600">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`pl-10 bg-white placeholder-gray-400 border-gray-300 text-gray-900 ${
                  passwordError ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                }`}
              />
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordError && !password && (
              <p className="mt-1 text-sm text-red-600">{passwordError}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className={password.length >= 8 ? "text-green-600" : ""}>• 8+ characters</div>
              <div className={/(?=.*[a-z])/.test(password) ? "text-green-600" : ""}>
                • Lowercase letter
              </div>
              <div className={/(?=.*[A-Z])/.test(password) ? "text-green-600" : ""}>
                • Uppercase letter
              </div>
              <div className={/(?=.*\d)/.test(password) ? "text-green-600" : ""}>• Number</div>
            </div>
          </div>

          <div>
            <Label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`pl-10 bg-white placeholder-gray-400 border-gray-300 text-gray-900 ${
                  passwordError && confirmPassword
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : ""
                }`}
              />
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordError && confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {password === confirmPassword ? passwordError : "Passwords do not match"}
              </p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={
              loading ||
              !password ||
              !confirmPassword ||
              password !== confirmPassword ||
              !!validatePassword(password)
            }
            whileHover={{
              scale: loading ? 1 : 1.03,
              boxShadow: loading ? "none" : "0 0 24px #3b82f6",
            }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center ${
              loading ||
              !password ||
              !confirmPassword ||
              password !== confirmPassword ||
              !!validatePassword(password)
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg hover:shadow-xl"
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <FaSpinner className="animate-spin h-5 w-5 mr-2" />
                Updating...
              </div>
            ) : (
              "Update Password"
            )}
          </motion.button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <FaArrowLeft className="mr-2" />
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
