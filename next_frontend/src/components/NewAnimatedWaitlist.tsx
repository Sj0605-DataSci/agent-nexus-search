"use client";

import React, { useEffect, useCallback, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FaSun, FaMoon, FaUser, FaEnvelope, FaPhoneAlt } from "react-icons/fa";
import Confetti from "react-confetti";
import { useWindowSize } from "@/constant/styles/useWindowSize";
import { supabase } from "@/integrations/supabase/client";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import { generateToken } from "@/utils/globalconstant";
import Aurora from "./Aurora";
import ToggleSystemTheme from "./ToggleSystemTheme";
import { useAppSelector } from "@/store";
import Link from "next/link";

const schema = yup.object().shape({
  name: yup.string().required("Full name is required").min(2),
  email: yup.string().required("Email is required").email("Invalid email"),
  phone: yup
    .string()
    .required("Phone number is required")
    .matches(/^\+?[0-9\s-()]{10,}$/, "Please enter a valid phone number"),
  team: yup.boolean(),
});

type FormData = yup.InferType<typeof schema>;

const backdropVariants: Variants = {
  animate: {
    rotate: [0, 15, -10, 0] as unknown as number, // Fix for readonly array issue
    scale: [1, 1.05, 0.98, 1] as unknown as number, // Fix for readonly array issue
    transition: {
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut",
      repeatType: "loop" as const,
    },
  },
};

const NewAnimatedWaitlist: React.FC = () => {
  const darkMode = useAppSelector(s => s.theme.dark);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    const token = localStorage.getItem("waitlistToken");
    if (token && !isSuccess) {
      setIsSuccess(true);
    }
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      team: false,
    },
  });

  const onSubmit = useCallback<SubmitHandler<FormData>>(
    async formData => {
      setSubmitError("");
      setIsSubmitting(true);

      try {
        const { error } = await supabase
          .from("invitees")
          .insert([
            {
              name: formData.name,
              email: formData.email,
              phone_number: formData.phone,
            },
          ])
          .select();

        if (error) {
          if (error.code === "23505") {
            if (error.message.includes("email")) {
              showErrorToast("This email is already registered");
            } else if (error.message.includes("phone_number")) {
              showErrorToast("This phone number is already registered");
            }
          } else {
            setSubmitError("Oops! Something went wrong.");
            console.error("Submission error:", error.message);
          }
          return;
        }

        try {
          const token = generateToken();
          localStorage.setItem("waitlistToken", token);
        } catch (err) {
          console.warn("Unable to persist token in localStorage:", err);
        }

        showSuccessToast("Successfully joined the waitlist!");
        setIsSuccess(true);
        reset(); // Optional: reset to default values
      } catch (e) {
        console.error("Unexpected error during submission:", e);
        setSubmitError("Oops! Something went wrong.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset]
  );
  const isButtonDisabled = isSubmitting || !isDirty || !isValid;

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${
        darkMode
          ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-purple-50"
      }`}
    >
      <AnimatePresence>
        {isSuccess && (
          <Confetti
            width={width}
            height={height}
            numberOfPieces={200}
            recycle={false}
            gravity={0.2}
          />
        )}
      </AnimatePresence>

      <div
        className={`absolute top-0 left-0 z-0 ${darkMode ? "flex" : "hidden"}`}
        style={{
          width: "100vw",
          height: "320px", // or any custom height you prefer
          overflow: "hidden",
        }}
      >
        <Aurora
          colorStops={["#5227ff", "#7cff67", "#5227ff"]}
          dark={darkMode}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      <motion.div
        className="absolute z-0 -mt-30 hidden md:flex"
        style={{
          width: 420,
          height: 520,
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

      {/* Navigation links positioned at the top */}
      <div className="absolute top-6 right-6 z-20 flex items-center space-x-6">
        <Link href="/login">
          <span className={`text-sm font-medium cursor-pointer hover:underline hover:opacity-80 transition-opacity ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
            Login
          </span>
        </Link>
        <Link href="/signup">
          <span className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-all ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"} shadow-md`}>
            Sign up
          </span>
        </Link>
      </div>

      <motion.main
        className={`relative mx-2 z-10 w-full max-w-md rounded-3xl shadow-2xl border transition-colors duration-500 ${
          darkMode ? "bg-black/80 border-gray-800" : "bg-white/90 border-gray-200"
        } p-8 sm:p-10 flex flex-col gap-6`}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {isSuccess ? (
          <div className="text-center py-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                darkMode ? "bg-green-900/30" : "bg-green-100"
              }`}
            >
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2
              className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              You're on the list!
            </h2>
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
              Thank you for joining our waitlist. We'll be in touch soon!
            </p>

          </div>
        ) : (
          <>
            <div>
              <p
                className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                DiscoverMinds.ai
              </p>
              <h1
                className={`text-2xl sm:text-3xl font-extrabold mb-3 leading-tight ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Join the Waitlist
              </h1>
              <p className={` text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Reimagine how you find the perfect hire or your perfect lead smarter, faster, more
                personal.
              </p>

            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <input
                  id="name"
                  type="text"
                  placeholder="Full Name"
                  {...register("name")}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all duration-200 ${
                    darkMode
                      ? "bg-gray-900/80 text-white border-gray-800 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-400 placeholder-gray-400"
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-400`}
                />
                {errors.name && <span className="text-xs text-red-400">{errors.name.message}</span>}
              </div>

              <div>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register("email")}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all duration-200 ${
                    darkMode
                      ? "bg-gray-900/80 text-white border-gray-800 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-400 placeholder-gray-400"
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-400`}
                />
                {errors.email && (
                  <span className="text-xs text-red-400">{errors.email.message}</span>
                )}
              </div>

              <div>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Phone Number"
                  {...register("phone")}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all duration-200 ${
                    darkMode
                      ? "bg-gray-900/80 text-white border-gray-800 placeholder-gray-500"
                      : "bg-white text-gray-900 border-gray-400 placeholder-gray-400"
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-400`}
                />
                {errors.phone && (
                  <span className="text-xs text-red-400">{errors.phone.message}</span>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isButtonDisabled}
                whileHover={{
                  scale: isButtonDisabled ? 1 : 1.03,
                  boxShadow: isButtonDisabled ? "none" : "0 0 24px #3b82f6",
                  background: isButtonDisabled
                    ? undefined
                    : darkMode
                      ? "linear-gradient(90deg, #2563eb 0%, #6366f1 100%)"
                      : "linear-gradient(90deg, #3b82f6 0%, #a5b4fc 100%)",
                }}
                whileTap={{
                  scale: isButtonDisabled ? 1 : 0.97,
                }}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                  isButtonDisabled
                    ? darkMode
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : darkMode
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-lg"
                      : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Join waitlist"}
              </motion.button>

              {submitError && (
                <p className={`text-sm text-center ${darkMode ? "text-red-400" : "text-red-600"}`}>
                  {submitError}
                </p>
              )}

              <p className={`text-xs text-center ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                We respect your privacy. No spam, ever.
              </p>
            </form>

            {/* Social proof */}
            <div className="flex items-center gap-2 mt-3">
              <img
                src="https://randomuser.me/api/portraits/men/32.jpg"
                alt=""
                className="w-6 h-6 rounded-full border-2 border-white ml-1"
              />
              <img
                src="https://randomuser.me/api/portraits/women/44.jpg"
                alt=""
                className="w-6 h-6 rounded-full border-2 border-white -ml-4"
              />
              <img
                src="https://randomuser.me/api/portraits/men/45.jpg"
                alt=""
                className="w-6 h-6 rounded-full border-2 border-white -ml-4"
              />
              <span
                className={`text-xs font-medium ${darkMode ? "text-blue-200" : "text-blue-700"}`}
              >
                55+ Users already joined
              </span>
            </div>
          </>
        )}
      </motion.main>
    </div>
  );
};

export default NewAnimatedWaitlist;
