"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import Link from "next/link";

const schema = yup.object().shape({
  name: yup.string().required("Full name is required").min(2, "Name must be at least 2 characters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email")
    .test(
      "no-plus-in-email",
      "Email addresses with '+' are not allowed",
      value => !value || !value.includes("+")
    ),
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

export default function SignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [lastSignupData, setLastSignupData] = useState<FormData | null>(null);
  const { width, height } = useWindowSize();
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

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

  const handleResendEmail = useCallback(async () => {
    if (lastSignupData && resendTimer === 0) {
      try {
        const response = await apiClient.userSignUp(
          lastSignupData.email,
          lastSignupData.password,
          lastSignupData.name,
          lastSignupData.linkedin_url
        );

        if (response.success) {
          setResendTimer(60);
          showSuccessToast("Verification email resent successfully!");
        } else {
          throw new Error(response.message || "Failed to resend email");
        }
      } catch (error) {
        showErrorToast("Failed to resend email. Please try again.");
        console.error("Resend email error:", error);
      }
    }
  }, [lastSignupData, resendTimer]);

  const onSubmit: SubmitHandler<FormData> = useCallback(
    async data => {
      setIsSubmitting(true);
      try {
        router.prefetch("/login");

        const response = await apiClient.userSignUp(
          data.email,
          data.password,
          data.name,
          data.linkedin_url
        );

        if (response.success) {
          setLastSignupData(data);
          setResendTimer(60);

          setTimeout(() => {
            showSuccessToast("Signup mail sent successfully! Check your email.");
            setIsSuccess(true);
            reset();
          }, 0);

          return;
        }

        const msg = response.message?.toLowerCase() || "";
        if (
          (response.status_code === 400 && msg.includes("already registered")) ||
          msg.includes("already exists")
        ) {
          showErrorToast(
            "This email is already registered. Please use a different email or try logging in."
          );
        } else if (response.status_code === 400 && msg.includes("security purposes")) {
          showErrorToast(
            "You can only request signup again after a short wait. Please try again soon."
          );
        } else if (msg.includes("weak password")) {
          showErrorToast("Your password is too weak. Use at least 6 characters.");
        } else if (msg.includes("invalid email")) {
          showErrorToast("Please enter a valid email address.");
        } else {
          showErrorToast(response.message || "Signup failed. Please try again.");
        }
      } catch (err: any) {
        console.error("Signup exception", err);
        showErrorToast(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset, router]
  );

  const isButtonDisabled = isSubmitting || !isDirty;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8 flex items-center justify-center">
      {isSuccess && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={100}
          recycle={false}
          gravity={0.2}
        />
      )}
      <div
        className={`relative mx-2 md:mx-0 z-10 w-full max-w-md p-4 md:p-8 rounded-3xl shadow-2xl border transition-colors duration-500 ease-in animate-fade-in bg-white border-gray-200 text-gray-900`}
      >
        {isSuccess ? (
          <div className="relative max-w-md mx-auto  bg-white rounded-2xl text-center animate-fade-in-up">
            <div className="relative w-20 h-20 mx-auto mb-6 animate-scale-in">
              <div className="absolute inset-0 bg-green-50 rounded-full flex items-center justify-center">
                <div className="relative w-16 h-16 bg-green-100 rounded-full flex items-center justify-center ">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white ">
                    <svg
                      className="w-8 h-8 animate-checkmark"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                        className="animate-draw-checkmark"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 animate-fade-in-up animate-delay-300">
              You're all set! 🎉
            </h2>

            <p className="text-gray-600 mb-6 text-base leading-relaxed animate-fade-in-up animate-delay-400">
              We've sent a verification link to your email.
              <br />
              Please check your inbox to complete your signup.
            </p>

            <div className="space-y-4 animate-fade-in-up animate-delay-500">
              <div className="inline-flex items-center text-sm text-gray-500">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Link expires in 24 hours</span>
              </div>

              <div className="flex flex-col items-center w-full justify-center sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Prefetch and navigate immediately
                    router.prefetch("/login");
                    router.push("/login");
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Go to Login
                </button>

                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendTimer > 0}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    resendTimer > 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-blue-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 focus:ring-blue-500"
                  }`}
                >
                  {resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend Email"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="">
                <BrandLogo className="mb-1" />
              </div>
              <h1 className={`text-xl sm:text-xl font-extrabold mb-1 text-gray-700`}>
                Create Your Account
              </h1>
              <p className={`text-sm mb-4 text-gray-700`}>
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
                      className={`w-full pl-10 ${field === "password" ? "pr-10" : "pr-4"} py-3 rounded-lg border outline-none transition-all duration-300 focus:ring-2 bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500`}
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
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-300 focus:ring-2 bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500`}
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
