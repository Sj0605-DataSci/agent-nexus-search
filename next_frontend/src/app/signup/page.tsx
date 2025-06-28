"use client";

import { useState, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Confetti from "react-confetti";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FiLock, FiUser, FiMail } from "react-icons/fi";
import { useWindowSize } from "@/constant/styles/useWindowSize";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/store";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";
import Link from "next/link";

const schema = yup.object().shape({
  name: yup.string().required("Name is required").min(2),
  email: yup.string().required("Email is required").email("Invalid email"),
  password: yup.string().required("Password is required").min(6),
});

type FormData = yup.InferType<typeof schema>;

const backdropVariants: Variants = {
  animate: {
    rotate: [0, 15, -10, 0],
    scale: [1, 1.08, 0.95, 1],
    transition: { duration: 12, repeat: Infinity, ease: "easeInOut" },
  },
};

const Signup = () => {
  const darkMode = useAppSelector((s) => s.theme.dark);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { width, height } = useWindowSize();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<FormData> = useCallback(
    async (data) => {
      setIsSubmitting(true);
      try {
        // const { error, emailExists, weakPassword, invalidEmail, serverError } =
        //   await signUp(data.email, data.password, data.name);

        // if (error) {
        //   if (emailExists) {
        //     showErrorToast(
        //       "This email is already registered. Please log in instead."
        //     );
        //   } else if (weakPassword) {
        //     showErrorToast(
        //       "Your password is too weak. Use at least 6 characters."
        //     );
        //   } else if (invalidEmail) {
        //     showErrorToast("Please enter a valid email address.");
        //   } else if (serverError) {
        //     showErrorToast("Server error. Please try again later.");
        //   } else {
        //     showErrorToast(error.message); // fallback
        //   }
        //   return;
        // }

        // showSuccessToast("Signup success! Check your email.");
        // setIsSuccess(true);
        showErrorToast(
          "Signup functionality is disabled, Please try again later."
        );

        reset();
      } catch (err) {
        console.log("Signup exception", err);
        showErrorToast("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset, signUp]
  );

  const isDisabled = isSubmitting || !isDirty || !isValid;

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        darkMode
          ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800"
          : "bg-gray-100"
      }`}
    >
      <AnimatePresence>
        {isSuccess && (
          <Confetti
            width={width}
            height={height}
            numberOfPieces={250}
            recycle={false}
            gravity={0.2}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute z-0 hidden md:block"
        style={{
          width: 450,
          height: 550,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
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
            initial={{ filter: "blur(20px)", opacity: 0.7 }}
            animate={{ filter: "blur(35px)", opacity: 0.85 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <defs>
            <radialGradient id="darkGradient" cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="#2563eb" />
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

      <motion.main
        className={`relative mx-2 md:mx-0 z-10 w-full max-w-md  p-4 md:p-8 rounded-3xl shadow-2xl border transition-colors duration-500 ${
          darkMode
            ? "bg-black/80 border-gray-800 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <ToggleSystemTheme className="absolute top-4 right-4 " />

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center flex flex-col items-center gap-4 mt-4"
          >
            {/* ✅ Checkmark Icon with Sparkle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              // transition={{ type: "spring", stiffness: 200, damping: 12 }}
              transition={{
                duration: 0.6,
                ease: "easeInOut", // ✅ Supports multi-keyframe
              }}
              className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shadow-lg"
            >
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            {/* ✅ Textual Confirmation */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold"
            >
              You're all set!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-500 text-sm"
            >
              Check your email to complete your signup journey.
            </motion.p>
          </motion.div>
        ) : (
          <>
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-extrabold mb-3 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Create Your Account
              </h1>
              <p
                className={`text-sm mb-4 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Get started with DiscoverMinds.ai <br />
                It only takes a minute.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {["name", "email", "password"].map((field, idx) => (
                <motion.div
                  key={field}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                >
                  <div className="relative">
                    <input
                      type={field === "password" ? "password" : "text"}
                      placeholder={
                        field === "name"
                          ? "Full Name"
                          : field === "email"
                            ? "you@example.com"
                            : "Password"
                      }
                      {...register(field as keyof FormData)}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
                        darkMode
                          ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500 focus:ring-indigo-500"
                          : "bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500"
                      }`}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {field === "name" ? (
                        <FiUser size={18} />
                      ) : field === "email" ? (
                        <FiMail size={18} />
                      ) : (
                        <FiLock size={18} />
                      )}
                    </span>
                  </div>

                  {errors[field as keyof FormData] && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors[field as keyof FormData]?.message}
                    </p>
                  )}
                </motion.div>
              ))}

              <motion.button
                type="submit"
                disabled={isDisabled}
                whileHover={!isDisabled ? { scale: 1.03 } : {}}
                whileTap={!isDisabled ? { scale: 0.97 } : {}}
                className={`w-full py-3 rounded-lg font-semibold text-lg relative transition-all duration-300 flex items-center justify-center ${
                  isDisabled
                    ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <motion.span
                  className="absolute left-4 top-1/2 transform -translate-y-1/2"
                  initial={{ scale: 0 }}
                  animate={{ scale: isSubmitting ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                </motion.span>

                {isSuccess
                  ? "Success!"
                  : isSubmitting
                    ? "Signing Up..."
                    : "Sign Up"}
              </motion.button>
              <div className="mt-4 text-center text-sm">
                <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  Already have an account?
                </span>{" "}
                <Link
                  href="/login"
                  className="font-medium text-indigo-500 hover:underline"
                >
                  Log in
                </Link>
              </div>
            </form>
          </>
        )}
      </motion.main>
    </div>
  );
};

export default Signup;
