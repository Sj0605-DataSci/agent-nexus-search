"use client";

import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Eye, EyeOff, Mail, Lock, User, Linkedin, Phone, X } from "lucide-react";
import Confetti from "react-confetti";
import CountryCodeSelector from "@/components/CountryCodeSelector";
import { apiClient } from "@/integrations/fastapi/client";
import { SignUpResponse } from "@/integrations/fastapi/types";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";
import posthog from "posthog-js";
import { useAppDispatch, useAppSelector } from "@/store";
import { loginUser, fetchProfile } from "@/store/profileSlice";
import { useWindowSize } from "@/constant/styles/useWindowSize";
import { useAuth } from "@/hooks/useAuth";
import AuthBrandingPanel from "@/components/auth/AuthBrandingPanel";
import BrandLogo from "@/components/BrandLogo";
import { supabaseHandler } from "../supabaseClient";
import { DEFAULT_COUNTRY_CODE } from "@/utils/countryCodes";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.853 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

const AuthComponent = () => {
  const [formToShow, setFormToShow] = useState<"signup" | "signin" | "reset" | "hidetoggle">(
    "signin"
  );
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const dispatch = useAppDispatch();
  const { profile, loading: profileLoading } = useAppSelector(state => state.profile);

  useEffect(() => {
    if (!authLoading) {
      if (user && profile) {
        router.replace("/chat/new");
      } else if (user && !profile) {
        dispatch(fetchProfile());
      }
    }
  }, [user, profile, authLoading, dispatch, router]);

  const isLoading = authLoading || profileLoading;

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
            <BrandLogo className="mb-3" size="large" />

            <div className="relative flex justify-between items-center mb-8">
              {/* {formToShow != "reset" && formToShow != "hidetoggle" && (
                <div className="relative bg-gray-200 p-1 rounded-full flex items-center w-[170px]">
                  {["Sign up", "Sign in"].map((item, index) => {
                    const isActive =
                      (formToShow === "signup" && index === 0) ||
                      (formToShow === "signin" && index === 1);
                    return (
                      <div
                        key={item}
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
              )} */}
              <button
                onClick={() =>
                  formToShow === "hidetoggle" ? setFormToShow("signin") : router.push("/")
                }
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={formToShow}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {/* {formToShow === "signup" && (
                  <SignUpForm successSignupSubmission={() => setFormToShow("hidetoggle")} />
                )} */}
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
});

type FormData = yup.InferType<typeof schema>;

const SuccessSignupModal = () => {
  const [resendTimer, setResendTimer] = useState(5);
  const [lastSignupData, setLastSignupData] = useState<FormData | null>(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
    const storedData = localStorage.getItem("lastSignupData");
    if (storedData) {
      setLastSignupData(JSON.parse(storedData));
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

  return (
    <div className="text-center py-8">
      <Confetti width={width} height={height} numberOfPieces={200} recycle={false} />
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
        const phoneNumber = phoneValue;

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
          localStorage.setItem("lastSignupData", JSON.stringify(dataToSave));
          reset();
          successSignupSubmission();
          showSuccessToast("Signup mail sent successfully! Check your email.");
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
    [reset, successSignupSubmission, phoneValue]
  );

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
      <p className="text-gray-500 mb-6 text-sm">
        Get started with our app, just create an account.
      </p>
      <SocialSignIn
        mode="signup"
        onError={error => {
          console.error("Sign up error:", error);
        }}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        <div>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              {...register("name")}
              type="text"
              placeholder="Full Name"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.name?.message}</p>
        </div>
        <div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.email?.message}</p>
        </div>
        <div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.password?.message}</p>
        </div>
        <div>
          <div className="relative">
            <Linkedin
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              {...register("linkedin_url")}
              type="text"
              placeholder="LinkedIn Profile URL"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.linkedin_url ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">
            {errors.linkedin_url?.message}
          </p>
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
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Account..." : "Create an account"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-3">
        By creating an account, you agree to our{" "}
        <a href="#" className="font-semibold text-gray-500">
          Terms & Service
        </a>
      </p>
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
      posthog.capture("login_attempted", { email: data.email });

      const loginResult = await apiClient.login(data.email, data.password);

      if (loginResult.success && loginResult.status_code === 200) {
        if (loginResult.data.access_token) {
          localStorage.setItem("discover_minds_access_token", loginResult.data.access_token);
        }
        if (loginResult.data.refresh_token) {
          localStorage.setItem("discover_minds_refresh_token", loginResult.data.refresh_token);
        }

        router.replace("/chat/new");
        const profileResponse = await apiClient.fetchProfile();
        const profileData = profileResponse.data;

        dispatch({ type: "profile/setProfileData", payload: profileData });

        posthog.identify(profileData.id, {
          email: profileData.email,
          name: profileData.full_name,
        });
        posthog.capture("login_successful", {
          userId: profileData.id,
          hasConnections: profileData.has_connections,
        });
      } else {
        showErrorToast(loginResult.message || "Please check your credentials and try again.");
        posthog.capture("login_error", { reason: loginResult.message || "Unknown error" });
      }
    } catch (err: any) {
      showErrorToast(err.message || "Please check your credentials and try again.");
      posthog.capture("login_error", { reason: err.message || "Unknown error" });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 ">Welcome back</h2>
      <p className="text-gray-500 mb-4 text-sm">Sign in to continue to your account.</p>
      <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <p className="text-yellow-700 text-sm mb-2">
          Login access is currently limited to approved users only.
        </p>
        <p className="text-yellow-700 text-sm mb-3">
          Thanks for showing interest! Join our waitlist and we'll reach out once we launch.
        </p>
        <a
          href="/join-waitlist"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors duration-200"
        >
          Join Waitlist
        </a>
      </div>

      {/* <SocialSignIn
        mode="signin"
        onError={error => {
          console.error("Sign in error:", error);
        }}
      /> */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
        <div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.email?.message}</p>
        </div>
        <div>
          <div className="relative -mt-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="text-red-500 text-[10px] -mt-[4px] h-5 pt-1">{errors.password?.message}</p>
        </div>
        <div className="flex justify-end -mt-2 mb-2">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
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
      const baseUrl = window.location.origin;
      const result = await apiClient.resetPassword(email, baseUrl);
      if (result.success) {
        setSubmittedEmail(email);
        setEmailSent(true);
        setResendTimer(60);
        showSuccessToast("Password reset email sent!");
        reset();
      } else {
        showErrorToast(result.message || "Failed to send reset email.");
      }
    } catch (error: any) {
      showErrorToast(error.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (data: { email: string }) => {
    sendResetLink(data.email);
  };

  const handleResend = () => {
    if (resendTimer === 0 && submittedEmail) {
      sendResetLink(submittedEmail);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-600 mb-4">
          We've sent a password reset link to{" "}
          <strong className="text-gray-800">{submittedEmail}</strong>.
        </p>
        <button
          onClick={handleResend}
          disabled={resendTimer > 0 || isLoading}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${resendTimer > 0 || isLoading ? "bg-gray-200 text-gray-500" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
        >
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Email"}
        </button>
        <button
          onClick={onBackToSignIn}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-500 font-medium"
        >
          &larr; Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
      <p className="text-gray-500 mb-6 text-sm">Enter your email to receive a reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              {...register("email")}
              type="email"
              placeholder="Enter your email"
              className={`w-full bg-gray-100 border rounded-lg py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
          </div>
          <p className="text-red-500 text-xs h-5 pt-1">{errors.email?.message}</p>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
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

  // const handleSocialAuth = async (provider: "google" | "linkedin") => {
  //   if (typeof window === "undefined") return;

  //   try {
  //     setIsLoading(true);
  //     localStorage.setItem("oauth_loading", "true");
  //     localStorage.setItem("oauth_provider", provider);

  //     if (window.posthog) {
  //       window.posthog.capture(`${mode}_attempt`, { provider });
  //     }

  //     const state = Math.random().toString(36).substring(2, 15);
  //     localStorage.setItem("oauth_state", state);

  //     const options = {
  //       redirectTo: `${window.location.origin}/auth/callback`,
  //       queryParams: {
  //         access_type: "offline",
  //         prompt: "consent",
  //         state: state,
  //       },
  //       scopes: ["email", "profile", "https://www.googleapis.com/auth/user.phonenumbers.read"].join(
  //         " "
  //       ),
  //     };

  // const { error } = await supabaseHandler.auth.signInWithOAuth({
  //   provider,
  //   options,
  // });

  //     if (error) {
  //       throw new Error(`OAuth sign-in failed: ${error.message}`);
  //     }
  // } catch (error) {
  //   console.error(`Error during ${mode} with ${provider}:`, error);
  //   localStorage.removeItem("oauth_loading");
  //   localStorage.removeItem("oauth_state");
  //   onError?.(error as Error);

  //   if (window.posthog) {
  //     window.posthog.capture(`${mode}_error`, {
  //       provider,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //   }
  // } finally {
  //   if (typeof window !== "undefined") {
  //     setIsLoading(false);
  //   }
  // }
  // };
  const handleSocialAuth = async () => {
    // Track login attempt with PostHog if available
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.capture("login_attempt", { provider: "google" });
    }
    try {
      const { data, error } = await supabaseHandler.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          scopes: [
            "email",
            "profile",
            "https://www.googleapis.com/auth/user.phonenumbers.read",
          ].join(" "),
        },
      });

      if (error) {
        console.error("Error signing in with Google:", error);
      }
    } catch (error) {
      localStorage.removeItem("oauth_loading");
      localStorage.removeItem("oauth_state");
      onError?.(error as Error);
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
          <GoogleIcon />
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

export default AuthComponent;
