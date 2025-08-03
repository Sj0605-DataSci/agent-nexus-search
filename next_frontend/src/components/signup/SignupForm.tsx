"use client";

import { useState, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import BrandLogo from "@/components/BrandLogo";
import * as yup from "yup";
import Confetti from "react-confetti";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FiLock, FiUser, FiMail, FiEye, FiEyeOff } from "react-icons/fi";
import { FaLinkedin } from "react-icons/fa";
import { useWindowSize } from "@/constant/styles/useWindowSize";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import { apiClient } from "@/integrations/fastapi/client";
import { useAppSelector } from "@/store";
import Link from "next/link";

const schema = yup.object().shape({
  name: yup.string().required("Full name is required").min(2, "Name must be at least 2 characters"),
  email: yup.string().required("Email is required").email("Invalid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters")
    .matches(/[A-Z]/, "Password must contain an uppercase letter")
    .matches(/[a-z]/, "Password must contain a lowercase letter")
    .matches(/[0-9]/, "Password must contain a number")
    .matches(/[^A-Za-z0-9]/, "Password must contain a special character"),
  linkedin_url: yup
    .string()
    .required("LinkedIn profile URL is required")
    .matches(
      /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/,
      "Enter a valid LinkedIn profile URL"
    ),
});

type FormData = yup.InferType<typeof schema>;

const backdropVariants: Variants = {
  animate: {
    rotate: [0, 15, -10, 0],
    scale: [1, 1.08, 0.95, 1],
    transition: { duration: 15, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function SignupForm() {
  const darkMode = false;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { width, height } = useWindowSize();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid, isSubmitted },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const onSubmit: SubmitHandler<FormData> = useCallback(
    async data => {
      setIsSubmitting(true);
      try {
        const response = await apiClient.userSignUp(
          data.email,
          data.password,
          data.name,
          data.linkedin_url
        );

        if (!response.success) {
          const msg = response.message?.toLowerCase() || "";
          if (
            (response.status_code === 400 && msg.includes("already registered")) ||
            msg.includes("already exists")
          ) {
            showErrorToast(
              "This email is already registered. Please use a different email or try logging in."
            );
            return;
          } else if (response.status_code === 400 && msg.includes("security purposes")) {
            showErrorToast(
              "You can only request signup again after a short wait. Please try again soon."
            );
            return;
          } else if (msg.includes("weak password")) {
            showErrorToast("Your password is too weak. Use at least 6 characters.");
            return;
          } else if (msg.includes("invalid email")) {
            showErrorToast("Please enter a valid email address.");
            return;
          } else {
            showErrorToast(response.message || "Signup failed. Please try again.");
            return;
          }
        }

        showSuccessToast("Signup mail sent successfully! Check your email.");
        setIsSuccess(true);
        reset();
      } catch (err: any) {
        console.log("Signup exception", err);
        showErrorToast(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset]
  );

  const isButtonDisabled = isSubmitting || !isDirty;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8 flex items-center justify-center">
      <AnimatePresence>
        {isSuccess && (
          <Confetti
            width={width}
            height={height}
            numberOfPieces={100}
            recycle={false}
            gravity={0.2}
          />
        )}
      </AnimatePresence>

      <div
        className={`relative mx-2 md:mx-0 z-10 w-full max-w-md p-4 md:p-8 rounded-3xl shadow-2xl border transition-colors duration-500 ease-in animate-fade-in ${
          darkMode
            ? "bg-black/80 border-gray-800 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center flex flex-col items-center gap-4 mt-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

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
              <div className="mb-3">
                <BrandLogo className="mb-3" />
                <p className="text-gray-600">Sign in to your account</p>
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-extrabold mb-3 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Create Your Account
              </h1>
              <p className={`text-sm mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Get started with DiscoverMinds.ai <br />
                It only takes a minute.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="">
              {["name", "email", "password"].map(field => (
                <div key={field}>
                  <div className="relative">
                    <input
                      type={field === "password" ? (showPassword ? "text" : "password") : "text"}
                      placeholder={
                        field === "name"
                          ? "Full Name"
                          : field === "email"
                            ? "you@example.com"
                            : "Password"
                      }
                      {...register(field as keyof FormData)}
                      className={`w-full pl-10 ${field === "password" ? "pr-10" : "pr-4"} py-3 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
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
                    {field === "password" && (
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-0.5 transition-all duration-200 ${isSubmitted && errors[field as keyof FormData] ? "text-red-500" : "text-transparent"}`}
                    style={{ minHeight: 5 }}
                  >
                    {(isSubmitted && errors[field as keyof FormData]?.message) || "\u200E"}
                  </p>
                </div>
              ))}

              <div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="LinkedIn Profile URL "
                    {...register("linkedin_url")}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
                      darkMode
                        ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500 focus:ring-indigo-500"
                        : "bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500"
                    }`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                    <FaLinkedin size={18} color="[#99a1af]" />
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 transition-all duration-200 ${isSubmitted && errors.linkedin_url ? "text-red-500" : "text-transparent"}`}
                  style={{ minHeight: 5 }}
                >
                  {(isSubmitted && errors.linkedin_url?.message) || "\u200E"}
                </p>
              </div>

              <button
                type="submit"
                disabled={isButtonDisabled}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center ${
                  isButtonDisabled
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg"
                }`}
                style={{
                  opacity: isSubmitting ? 0.8 : 1,
                  transform: isSubmitting ? "scale(0.98)" : "none",
                }}
              >
                {isSubmitting && (
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2">
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
                  </span>
                )}
                {isSuccess ? "Success!" : isSubmitting ? "Signing Up..." : "Sign Up"}
              </button>
              <div className="mt-4 text-center text-sm">
                <span className={"text-gray-600"}>Already have an account?</span>{" "}
                <Link
                  prefetch={true}
                  href="/login"
                  className="font-medium text-indigo-500 hover:underline"
                >
                  Log in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
