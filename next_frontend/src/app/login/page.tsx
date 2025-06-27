"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { motion, Variants } from "framer-motion";
import posthog from "posthog-js";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Aurora from "@/components/Aurora";
import { useAppSelector } from "@/store";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";

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

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const darkMode = useAppSelector(s => s.theme.dark);

  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/searchengine");
  }, [user, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Error signing in",
            description: error.message,
            variant: "destructive",
          });
        } else {
          posthog.identify();
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
          router.push("/");
        }
      } catch (err) {
        toast({
          title: "Unexpected error",
          description: "Please try again.",
          variant: "destructive",
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [email, password, signIn, router, toast]
  );

  return (
    <div
      className={`min-h-screen flex items-center  justify-center transition-colors duration-500 ${
        darkMode
          ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-purple-50"
      }`}
    >
      <div
        className={`absolute top-0 left-0 z-0 w-full ${darkMode ? "flex" : "hidden"}`}
        style={{
          width: "100vw - 20px",
          height: "320px", // or any custom height you prefer
          overflow: "hidden",
        }}
      >
        <Aurora
          colorStops={["#5227ff", "#7cff67", "#5227ff"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      <motion.div
        className="absolute z-0 -mt-30 hidden md:flex"
        style={{
          width: 320,
          height: 420,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -55%)",
          pointerEvents: "none",
        }}
        variants={backdropVariants}
        animate="animate"
      >
        <svg width="100%" height="100%" viewBox="0 0 420 520" fill="none">
          <motion.ellipse
            cx="210"
            cy="260"
            rx="180"
            ry="240"
            fill={darkMode ? "url(#darkGradient)" : "url(#lightGradient)"}
            initial={{ filter: "blur(24px)", opacity: 0.7 }}
            animate={{ filter: "blur(36px)", opacity: 0.85 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <defs>
            <radialGradient id="darkGradient" cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <radialGradient id="lightGradient" cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="70%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#f3f4f6" />
            </radialGradient>
          </defs>
        </svg>
      </motion.div>

      <Card
        className={`relative w-full max-w-md mx-2 p-8 sm:p-10 rounded-3xl shadow-2xl border transition-colors duration-500 ${
          darkMode ? "bg-black/80 border-gray-800" : "bg-white/90 border-white/20 backdrop-blur-md"
        }`}
      >
        <ToggleSystemTheme className={`absolute top-5 right-5  `} />

        <div className=" mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode
                  ? "bg-gradient-to-r from-blue-700 to-indigo-700"
                  : "bg-gradient-to-r from-blue-500 to-purple-500"
              }`}
            >
              <Search className="h-6 w-6 text-white" />
            </div>
            <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              DiscoverMinds.ai
            </span>
          </Link>
          <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Sign in to your account</p>
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
                className={`pl-10 ${
                  darkMode
                    ? "bg-gray-900/80 placeholder-gray-500 border-gray-800 text-white"
                    : "bg-white placeholder-gray-400 border-gray-300 text-gray-900"
                }`}
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
                className={`pl-10 pr-10 ${
                  darkMode
                    ? "bg-gray-900/80 placeholder-gray-500 border-gray-800 text-white"
                    : "bg-white placeholder-gray-400 border-gray-300 text-gray-900"
                }`}
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
                ? darkMode
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                : darkMode
                  ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-lg"
                  : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg"
            }`}
          >
            {loading ? "Signing in..." : "Sign In"}
          </motion.button>

          <p className="text-center text-sm">
            <span className={darkMode ? "text-gray-500" : "text-gray-600"}>
              Don't have an account?{" "}
            </span>
            <Link
              href="/signup"
              className="font-medium underline underline-offset-2 hover:no-underline text-blue-600"
            >
              Sign up
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default Login;
