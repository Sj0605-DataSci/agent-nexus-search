"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import BrandLogo from "@/components/BrandLogo";
import { motion, Variants } from "framer-motion";
import posthog from "posthog-js";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import Aurora from "@/components/Aurora";
import { useAppDispatch } from "@/store";
import { loginUser, fetchProfile } from "@/store/profileSlice";

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        posthog.capture("login_attempted", { email });

        const loginResult = await dispatch(loginUser({ email, password })).unwrap();
        if (loginResult.success && loginResult.status_code === 200) {
          router.prefetch("/chat/new");

          dispatch(fetchProfile())
            .then(profileResult => {
              if (profileResult.payload?.success && profileResult.payload?.data) {
                const profileData = profileResult.payload.data;

                setTimeout(() => {
                  posthog.identify(profileData.id, {
                    email: profileData.email,
                    name: profileData.full_name,
                  });
                  posthog.capture("login_successful", {
                    userId: profileData.id,
                    hasConnections: profileData.has_connections,
                  });
                }, 0);
              }
            })
            .catch(error => console.error("Profile fetch error:", error));

          router.replace("/chat/new");
          showSuccessToast("Welcome back!", "You have successfully signed in.");
        } else {
          showErrorToast(
            "Login failed",
            loginResult.message || "Please check your credentials and try again."
          );
          posthog.capture("login_error", { reason: loginResult.message || "Unknown error" });
        }
      } catch (err: any) {
        showErrorToast(
          "Login failed",
          err.message || "Please check your credentials and try again."
        );
        posthog.capture("login_error", { reason: err.message || "Unknown error" });
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [email, password, dispatch, router]
  );

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-500 bg-gradient-to-br from-blue-50 to-purple-50`}
    >
      <div
        className={`absolute top-0 left-0 z-0 w-full h-[30vh] min-h-[280px] transition-opacity duration-300 opacity-0`}
        style={{
          width: "100%",
          overflow: "hidden",
          position: "fixed",
        }}
        aria-hidden="true"
      >
        <Aurora
          colorStops={["#5227ff", "#7cff67", "#5227ff"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>
      <div
        className={`relative w-full max-w-md mx-2 p-8 sm:p-10 rounded-3xl shadow-2xl border transition-colors duration-500 bg-white/90 border-white/20 backdrop-blur-md`}
      >
        <div className="mb-6">
          <BrandLogo className="mb-3" />
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                autoComplete="email"
                className={`pl-10 bg-white placeholder-gray-400 border-gray-300 text-gray-900`}
              />
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="sr-only">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={`pl-10 pr-10 bg-white placeholder-gray-400 border-gray-300 text-gray-900`}
              />
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{
              scale: loading ? 1 : 1.03,
              boxShadow: loading ? "none" : "0 0 24px #3b82f6",
            }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
              loading
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg"
            }`}
          >
            {loading ? "Signing in..." : "Sign In"}
          </motion.button>

          <p className="text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link
              prefetch={true}
              href="/signup"
              className="font-medium underline underline-offset-2 hover:no-underline text-blue-600"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
