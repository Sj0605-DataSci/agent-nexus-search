"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaSpinner } from "react-icons/fa";
import BrandLogo from "@/components/BrandLogo";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import Aurora from "@/components/Aurora";
import { apiClient } from "@/integrations/fastapi/client";
import { getBaseUrl } from "@/utils/globalconstant";

const RESEND_COOLDOWN = 30;

type FormData = {
  email: string;
};

const schema = yup.object().shape({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address")
    .test(
      "no-plus-in-email",
      "Email addresses with '+' are not allowed",
      value => !value || !value.includes("+")
    )
    .trim(),
});

export default function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid, isSubmitting },
    setError: setFormError,
    reset,
    clearErrors,
    trigger,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendEmail = useCallback(async () => {
    if (resendTimer > 0 || !submittedEmail) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.resetPassword(submittedEmail, baseUrl);

      if (result.success) {
        setResendTimer(RESEND_COOLDOWN);
        toast.success("Password reset email resent successfully!");
        posthog.capture("password_reset_resent", { email: submittedEmail });
      } else {
        throw new Error(result.message || "Failed to resend email");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to resend email. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Resend email error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [submittedEmail, resendTimer, baseUrl]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      setIsLoading(true);
      setError(null);
      setSubmittedEmail(data.email.trim());
      try {
        posthog.capture("password_reset_requested", { email: data.email });
        const result = await apiClient.resetPassword(data.email, baseUrl);

        if (result.success) {
          setResendTimer(RESEND_COOLDOWN);
          setEmailSent(true);
          toast.success("Password reset email sent! Please check your inbox.");
          posthog.capture("password_reset_email_sent", { email: data.email });
          reset();
        } else {
          throw new Error(result.message || "Failed to send reset email");
        }
      } catch (error: any) {
        console.error("Reset password error:", error);
        const errorMessage = error.message || "An error occurred while sending reset email";
        setError(errorMessage);
        toast.error(errorMessage);
        posthog.capture("password_reset_error", {
          email: data.email,
          error: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, reset]
  );

  if (emailSent) {
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
              <FaCheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-8">
              We've sent a password reset link to{" "}
              <span className="font-medium">{submittedEmail}</span>
            </p>

            <p className="text-sm text-gray-500 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>

            <button
              onClick={handleResendEmail}
              disabled={resendTimer > 0 || isLoading}
              className={`font-medium text-sm ${
                resendTimer > 0 || isLoading
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-700 hover:underline"
              }`}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend email"}
            </button>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => router.push("/user-auth")}
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
          <p className="text-gray-600">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </Label>
            </div>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                className={`pl-10 bg-white placeholder-gray-400 border-gray-300 text-gray-900 w-full ${
                  errors.email ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                }`}
                {...register("email")}
              />
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="min-h-[10px]">
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="pt-1">
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{
                scale: isLoading ? 1 : 1.03,
                boxShadow: isLoading ? "none" : "0 0 24px #3b82f6",
              }}
              whileTap={{ scale: isLoading ? 1 : 0.97 }}
              className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center ${
                isLoading
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <FaSpinner className="animate-spin h-5 w-5 mr-2" />
                  Sending...
                </div>
              ) : (
                "Send Reset Link"
              )}
            </motion.button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <button
            onClick={() => router.push("/user-auth")}
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
