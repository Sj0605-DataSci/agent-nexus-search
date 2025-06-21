import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import { FaSun, FaMoon, FaUser, FaEnvelope, FaPhoneAlt } from "react-icons/fa";
import Confetti from "react-confetti";
import { useWindowSize } from "@/constant/styles/useWindowSize";
import { supabase } from "@/integrations/supabase/client";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";

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

const backdropVariants = {
  animate: {
    rotate: [0, 15, -10, 0],
    scale: [1, 1.05, 0.98, 1],
    transition: { duration: 10, repeat: Infinity, ease: "easeInOut" },
  },
};

const generateToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};
const NewAnimatedWaitlist: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, height } = useWindowSize();

  // Check for existing token on component mount
  useEffect(() => {
    const token = localStorage.getItem("waitlistToken");
    if (token) {
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

  const onSubmit = async (formData: {
    name: string;
    email: string;
    phone: string;
  }) => {
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
        }
        return;
      }

      const token = generateToken();
      localStorage.setItem("waitlistToken", token);

      showSuccessToast("Successfully joined the waitlist!");
      setIsSuccess(true);
      reset();
    } catch (e) {
      setSubmitError("Oops! Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${
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
            numberOfPieces={200}
            recycle={false}
            gravity={0.2}
          />
        )}
      </AnimatePresence>

      {/* Animated 3D-style Backdrop */}
      <motion.div
        className="absolute z-0 hidden md:flex"
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
            transition={{ duration: 2, yoyo: Infinity }}
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

      {/* Main Card */}
      <motion.main
        className={`relative mx-2 z-10 w-full max-w-md rounded-3xl shadow-2xl border transition-colors duration-500 ${
          darkMode
            ? "bg-black/80 border-gray-800"
            : "bg-white/90 border-gray-200"
        } p-8 sm:p-10 flex flex-col gap-6`}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Theme Switcher */}
        <button
          aria-label="Toggle dark mode"
          className={`absolute top-5 right-5 rounded-full p-2 bg-opacity-20 backdrop-blur-md transition-colors duration-300 ${
            darkMode
              ? "bg-gray-700 text-yellow-300"
              : "bg-gray-200 text-blue-600"
          }`}
          onClick={() => setDarkMode((dm) => !dm)}
        >
          {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
        </button>

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
              className={`text-xl font-semibold mb-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
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
                className={`text-xs font-semibold mb-2 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
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
              <p
                className={`mb-4 text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Reimagine how you find the perfect hire or your perfect lead
                smarter, faster, more personal.
              </p>
              <ul
                className={`mb-1 text-sm space-y-1 ${
                  darkMode ? "text-blue-300" : "text-blue-700"
                }`}
              >
                <li>✓ Make searching smarter</li>
                <li>✓ 79% faster candidate shortlisting</li>
                <li>✓ 3x more qualified matches</li>
              </ul>
            </div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
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
                {errors.name && (
                  <span className="text-xs text-red-400">
                    {errors.name.message}
                  </span>
                )}
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
                  <span className="text-xs text-red-400">
                    {errors.email.message}
                  </span>
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
                  <span className="text-xs text-red-400">
                    {errors.phone.message}
                  </span>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting || !isDirty || !isValid}
                whileHover={{
                  scale: isSubmitting || !isDirty || !isValid ? 1 : 1.03,
                  boxShadow:
                    isSubmitting || !isDirty || !isValid
                      ? "none"
                      : "0 0 24px #3b82f6",
                  background:
                    isSubmitting || !isDirty || !isValid
                      ? undefined
                      : darkMode
                      ? "linear-gradient(90deg, #2563eb 0%, #6366f1 100%)"
                      : "linear-gradient(90deg, #3b82f6 0%, #a5b4fc 100%)",
                }}
                whileTap={{
                  scale: isSubmitting || !isDirty || !isValid ? 1 : 0.97,
                }}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                  isSubmitting || !isDirty || !isValid
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
                <p
                  className={`text-sm text-center ${
                    darkMode ? "text-red-400" : "text-red-600"
                  }`}
                >
                  {submitError}
                </p>
              )}

              <p
                className={`text-xs text-center ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                We respect your privacy. No spam, ever.
              </p>
            </form>

            {/* Social proof */}
            <div className="flex items-center gap-2 mt-3">
              <img
                src="https://randomuser.me/api/portraits/men/32.jpg"
                alt=""
                className="w-6 h-6 rounded-full border-2 border-white -ml-1"
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
                className={`text-xs font-medium ${
                  darkMode ? "text-blue-200" : "text-blue-700"
                }`}
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
