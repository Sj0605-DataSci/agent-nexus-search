"use client";

import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Eye, EyeOff, Mail, Lock, User, Linkedin, Phone, X } from "lucide-react";
import Confetti from "react-confetti";
import CountryCodeSelector from "@/components/CountryCodeSelector";
import { apiClient } from "@/integrations/fastapi/client";
import { SignUpResponse } from "@/integrations/fastapi/types";
import toast from "react-hot-toast";
import posthog from "posthog-js";
import { useAppDispatch, useAppSelector } from "@/store";
import { useWindowSize } from "@/constant/styles/useWindowSize";
import AuthBrandingPanel from "@/components/auth/AuthBrandingPanel";
import BrandLogo from "@/components/BrandLogo";
import { supabaseHandler } from "@/integrations/supabase/client";
import { DEFAULT_COUNTRY_CODE } from "@/utils/countryCodes";
import { saveTokens } from "@/utils/tokenManagement";
import Image from "next/image";

const AuthPage = () => {
  const searchParams = useSearchParams();
  const activeParam = searchParams?.get("active");

  const getInitialForm = (): "signup" | "signin" | "reset" | "hidetoggle" => {
    if (activeParam === "signin" || activeParam === "signup" || activeParam === "reset") {
      return activeParam;
    }
    return "signup";
  };

  const [formToShow, setFormToShow] = useState<"signup" | "signin" | "reset" | "hidetoggle">(
    getInitialForm()
  );

  const router = useRouter();
  const { profile } = useAppSelector(state => state.profile);

  useEffect(() => {
    if (profile) {
      router.replace("/chat/new");
    }
  }, [profile, router]);

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 h-screen">
        <div className="flex justify-center p-4 md:mt-12 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            <div className="flex w-full flex-col mb-2">
              <BrandLogo className="mb-3" size="medium" />
              <button
                onClick={() =>
                  formToShow === "hidetoggle" ? setFormToShow("signin") : router.push("/")
                }
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="relative flex justify-between items-center mb-2">
              {formToShow != "reset" && formToShow != "hidetoggle" && (
                <div className="relative bg-gray-200 p-1 rounded-full flex items-center w-[170px]">
                  {["Sign up", "Sign in"].map((item, index) => {
                    const isActive =
                      (formToShow === "signup" && index === 0) ||
                      (formToShow === "signin" && index === 1);
                    return (
                      <div
                        key={index}
                        onClick={() => setFormToShow(index === 0 ? "signup" : "signin")}
                        className="relative w-1/2 text-center text-sm font-semibold py-2 cursor-pointer"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-pill"
                            className="absolute inset-0 bg-white rounded-full shadow-md"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <span
                          className={`relative z-10 transition-colors ${isActive ? "text-gray-900" : "text-gray-500"}`}
                        >
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={formToShow}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {formToShow === "signup" && (
                  <SignUpForm successSignupSubmission={() => setFormToShow("hidetoggle")} />
                )}
                {formToShow === "hidetoggle" && <SuccessSignupModal />}
                {formToShow === "signin" && (
                  <SignInForm onForgotPassword={() => setFormToShow("reset")} />
                )}
                {formToShow === "reset" && (
                  <ResetPasswordForm onBackToSignIn={() => setFormToShow("signin")} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <AuthBrandingPanel />
      </div>
    </div>
  );
};

const phoneRegex = /^\+\d{1,3}\d{10}$/;

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
    .url("Please enter a valid URL")
    .matches(
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-z0-9_-]+\/?$/i,
      "Please enter a valid LinkedIn profile URL"
    ),
  phone_number: yup
    .string()
    .required("Phone number is required")
    .matches(phoneRegex, "Please enter a valid phone number (select a code and enter 10 digits)."),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], "User must agree to the Terms & Conditions and Privacy Policy")
    .required("User must agree to the Terms & Conditions and Privacy Policy"),
});

type FormData = yup.InferType<typeof schema>;

const SuccessSignupModal = () => {
  const [resendTimer, setResendTimer] = useState(30);
  const [lastSignupData, setLastSignupData] = useState<FormData | null>(null);
  const { width = 800, height = 600 } = useWindowSize();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("lastSignupData");
      if (storedData) {
        try {
          setLastSignupData(JSON.parse(storedData));
        } catch (error) {
          console.error("Error parsing lastSignupData:", error);
          localStorage.removeItem("lastSignupData");
        }
      }
    }

    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendEmail = useCallback(async () => {
    if (lastSignupData && resendTimer === 0) {
      try {
        const response: SignUpResponse = await apiClient.userSignUp(
          lastSignupData.email,
          lastSignupData.password,
          lastSignupData.name,
          lastSignupData.linkedin_url || "",
          lastSignupData.phone_number || ""
        );

        if (response.success) {
          setResendTimer(60);
          toast.success("Verification email resent successfully!");
        } else {
          throw new Error(response.message || "Failed to resend email");
        }
      } catch (error) {
        toast.error("Failed to resend email. Please try again.");
        console.error("Resend email error:", error);
      }
    }
  }, [lastSignupData, resendTimer]);

  return (
    <div className="text-center py-8">
      {typeof window !== "undefined" && (
        <Confetti width={width} height={height} numberOfPieces={200} recycle={false} />
      )}
      <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
          <svg
            className="w-8 h-8"
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
            ></path>
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">You're all set!</h2>
      <p className="text-gray-600 mb-6">We've sent a verification link to your email.</p>
      <button
        type="button"
        onClick={handleResendEmail}
        disabled={resendTimer > 0}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          resendTimer > 0
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
        }`}
      >
        {resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend Email"}
      </button>
    </div>
  );
};

const SignUpFormComponent = ({
  successSignupSubmission,
}: {
  successSignupSubmission: () => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneValue, setPhoneValue] = useState(`${DEFAULT_COUNTRY_CODE}-`);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, touchedFields, isSubmitted },
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onBlur",
  });
  const fullPhoneNumber = useMemo(() => {
    const [dial, number] = phoneValue.split("-");
    return dial && number ? `${dial}${number}` : ""; // empty until both parts exist
  }, [phoneValue]);

  const onSubmit: SubmitHandler<FormData> = useCallback(
    async data => {
      setIsSubmitting(true);
      try {
        // Format phone number as '91-8929495901'
        const phoneNumber = phoneValue || "";

        if (!data.email || !data.password || !data.name) {
          toast.error("Please fill in all required fields");
          setIsSubmitting(false);
          return;
        }

        const response: SignUpResponse = await apiClient.userSignUp(
          data.email,
          data.password,
          data.name,
          data.linkedin_url || "",
          phoneNumber
        );

        if (response.success) {
          // Save phone number along with other data for resend functionality
          const dataToSave = {
            ...data,
            phone_number: fullPhoneNumber,
          };
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("lastSignupData", JSON.stringify(dataToSave));
            } catch (error) {
              console.error("Error saving signup data to localStorage:", error);
            }
          }
          reset();
          successSignupSubmission();
          toast.success("Signup mail sent successfully! Check your email.");
          return;
        }

        const msg = response.message?.toLowerCase() || "";
        if (
          (response.status_code === 400 && msg.includes("already registered")) ||
          msg.includes("already exists")
        ) {
          toast.error(
            "This email is already registered. Please use a different email or try logging in."
          );
        } else {
          toast.error(response.message || "Signup failed. Please try again.");
        }
      } catch (err: any) {
        console.error("Signup exception", err);
        toast.error(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset, successSignupSubmission, phoneValue]
  );

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
      <p className="text-gray-500 mb-6 text-sm">Connect with the right people, right away</p>
      {/* <SocialSignIn
        mode="signup"
        onError={error => {
          console.error("Sign up error:", error);
        }}
      /> */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              {...register("name")}
              type="text"
              placeholder="Full Name"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.name?.message}</p>
        </div>
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.email?.message}</p>
        </div>
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.password?.message}</p>
        </div>
        <div>
          <div className="relative w-full">
            <CountryCodeSelector
              value={phoneValue}
              onChange={setPhoneValue}
              register={register}
              name="phone_number"
              error={!!errors.phone_number}
              className=""
              setValue={setValue}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">
            {errors.phone_number?.message}
          </p>
        </div>
        <div>
          <div className="relative">
            <Linkedin
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              {...register("linkedin_url")}
              type="text"
              placeholder="LinkedIn Profile URL"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.linkedin_url ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">
            {errors.linkedin_url?.message}
          </p>
        </div>

        <div className="">
          <label className="flex items-center justify-start gap-2 cursor-pointer group">
            <input
              {...register("agreeToTerms")}
              type="checkbox"
              className=" w-3.5 h-3.5  text-indigo-600 border-gray-300 rounded-md overflow-hidden cursor-pointer"
            />
            <span className="text-[11px] mt-[2px] text-gray-600 leading-relaxed">
              I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
              >
                Terms & Conditions
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
              >
                Privacy Policy
              </a>
            </span>
          </label>
          <p className="text-red-500 text-[10px] h-5 ">{errors.agreeToTerms?.message}</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="w-full bg-gray-900 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Account..." : "Start Discovering"}
        </button>
      </form>
    </div>
  );
};

// Memoize the SignUpForm component to prevent unnecessary re-renders
const SignUpForm = memo(SignUpFormComponent);
SignUpForm.displayName = "SignUpForm";

const signInSchema = yup.object().shape({
  email: yup.string().required("Email is required").email("Invalid email format"),
  password: yup.string().required("Password is required"),
});

const SignInForm = ({ onForgotPassword }: { onForgotPassword: () => void }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(signInSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: yup.InferType<typeof signInSchema>) => {
    setIsSubmitting(true);
    try {
      router.prefetch("/chat/new");
      if (!data.email || !data.password) {
        toast.error("Please enter both email and password");
        setIsSubmitting(false);
        return;
      }

      try {
        posthog.capture("login_attempted", { email: data.email });
      } catch (err) {
        console.error("Error capturing analytics:", err);
      }

      const loginResult = await apiClient.login(data.email, data.password);

      if (loginResult.success) {
        if (loginResult.data?.access_token && loginResult.data?.refresh_token) {
          saveTokens(loginResult.data.access_token, loginResult.data.refresh_token);
        }

        try {
          router.replace("/chat/new");
        } catch (routerError) {
          console.error("Navigation error:", routerError);
          // Fallback for navigation errors
          if (typeof window !== "undefined") {
            window.location.href = "/chat/new";
          }
        }
      } else {
        toast.error(loginResult.message || "Please check your credentials and try again.");
        posthog.capture("login_error", { reason: loginResult.message || "Unknown error" });
      }
      setIsSubmitting(false);
    } catch (err: any) {
      toast.error(err.message || "Please check your credentials and try again.");
      posthog.capture("login_error", { reason: err.message || "Unknown error" });
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 ">Welcome back</h2>
      <p className="text-gray-500 mb-4 text-sm">Sign in to unlock warm introductions</p>

      {/* <SocialSignIn
        mode="signin"
        onError={error => {
          console.error("Sign in error:", error);
        }}
      /> */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(onSubmit)(e);
        }}
        className="grid gap-2"
      >
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.email?.message}</p>
        </div>
        <div>
          <div className="relative -mt-2">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.password?.message}</p>
        </div>
        <div className="flex justify-end -mt-2 mb-2">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="w-full bg-gray-900 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

const resetPasswordSchema = yup.object().shape({
  email: yup.string().required("Email is required").email("Please enter a valid email address"),
});

const ResetPasswordForm = ({ onBackToSignIn }: { onBackToSignIn: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    mode: "onChange",
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

  const sendResetLink = async (email: string) => {
    setIsLoading(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      if (!baseUrl) {
        throw new Error("Could not determine base URL");
      }
      const result = await apiClient.resetPassword(email, baseUrl);
      if (result.success) {
        setSubmittedEmail(email);
        setEmailSent(true);
        setResendTimer(60);
        toast.success("Password reset email sent!");
        reset();
      } else {
        toast.error(result.message || "Failed to send reset email.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: { email: string }) => {
    if (data && data.email) {
      sendResetLink(data.email);
    } else {
      toast.error("Please enter a valid email address");
    }
  };

  const handleResend = () => {
    if (resendTimer === 0 && submittedEmail) {
      sendResetLink(submittedEmail);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-600 text-xs mb-4">
          We've sent a password reset link to{" "}
          <strong className="text-gray-800">{submittedEmail}</strong>.
        </p>
        <button
          onClick={handleResend}
          disabled={resendTimer > 0 || isLoading}
          className={`w-full py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${resendTimer > 0 || isLoading ? "bg-gray-200 text-gray-500" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
        >
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Email"}
        </button>
        <button
          onClick={onBackToSignIn}
          className="mt-4 text-xs text-indigo-600 hover:text-indigo-500 font-medium"
        >
          &larr; Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
      <p className="text-gray-500 mb-6 text-sm">Enter your email to receive a reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              className={`w-full bg-gray-100 border rounded-lg h-9 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-xs h-5 pt-1">{errors.email?.message}</p>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <button
        onClick={onBackToSignIn}
        className="mt-6 text-sm text-indigo-600 hover:text-indigo-500 font-medium w-full text-center"
      >
        &larr; Back to Sign In
      </button>
    </div>
  );
};

interface SocialSignInProps {
  mode?: "signin" | "signup";
  onError?: (error: Error) => void;
}

const SocialSignIn: React.FC<SocialSignInProps> = ({ mode = "signin", onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialAuth = async () => {
    try {
      setIsLoading(true);

      if (typeof window !== "undefined") {
        localStorage.setItem("oauth_loading", "true");
        localStorage.setItem("oauth_provider", "google");

        if (posthog) {
          posthog.capture(`${mode}_attempt`, { provider: "google" });
        }
      }

      const { data, error } = await supabaseHandler.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          scopes: [
            "openid",
            "email",
            "profile",
            // "https://www.googleapis.com/auth/user.phonenumbers.read",
          ].join(" "),
        },
      });

      if (error) {
        console.error("Error signing in with Google:", error);

        if (error.message?.includes("access_denied") || error.message?.includes("verification")) {
          toast.error(
            "Google login failed: This app is in testing mode and your email may not be on the approved testers list. Please contact the administrator."
          );
        } else {
          toast.error("Failed to sign in with Google. Please try again later.");
        }
        throw error;
      }
    } catch (error) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("oauth_loading");
        localStorage.removeItem("oauth_state");
        localStorage.removeItem("oauth_provider");
      }
      onError?.(error as Error);

      if (typeof window !== "undefined" && posthog) {
        posthog.capture(`${mode}_error`, {
          provider: "google",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      if (typeof window !== "undefined") {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="mt-2 ">
      <div className=" space-y-2">
        <button
          onClick={() => handleSocialAuth()}
          disabled={isLoading}
          className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-200 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Image src="/logos/Google.svg" alt="Google logo" width={24} height={24} />
          <span className="ml-2">{isLoading ? "Processing..." : `Continue with Google`}</span>
        </button>
      </div>
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-400">
            OR {mode === "signin" ? "SIGN IN" : "SIGN UP"} WITH
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
