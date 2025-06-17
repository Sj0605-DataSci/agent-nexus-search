import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { FaUser, FaEnvelope, FaPhoneAlt, FaInfoCircle } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";
import { showErrorToast, showSuccessToast } from "@/utils/toastManager";

const schema = yup.object().shape({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
  phone: yup
    .string()
    .required("Phone number is required")
    .matches(/^\+?[0-9\s-()]{10,}$/, "Please enter a valid phone number"),
});

export default function AnimatedWaitlist() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onSubmit = async (formData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
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
        // Handle duplicate email or phone number errors
        if (error.code === "23505") {
          if (error.message.includes("email")) {
            showErrorToast("This email is already registered");
          } else if (error.message.includes("phone_number")) {
            showErrorToast("This phone number is already registered");
          }
        }
        return;
      } else {
        showSuccessToast("Successfully joined the waitlist!");
        setIsSuccess(true);
      }
      reset();
    } catch (error) {
      setSubmitError("Oops! Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6">
      <AnimatePresence>
        {isSuccess && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={200}
            recycle={false}
            gravity={0.2}
          />
        )}
      </AnimatePresence>

      <main className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-2">
          Join the Waitlist
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Reimagine how you find the perfect hire or your perfect lead smarter,
          faster, more personal.
        </p>
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              You're on the list!
            </h2>
            <p className="text-gray-600">
              Thank you for joining our waitlist. We'll be in touch soon!
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            animate="visible"
            key={submitError ? "shake" : "form"}
            {...(submitError ? { animate: "shake" } : {})}
            className="space-y-6"
            noValidate
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700 mb-1 flex items-center"
              >
                <FaUser className="mr-2 text-blue-500" />
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register("name")}
                className={`w-full px-4 py-3 rounded-lg border text-gray-900 placeholder-gray-400 transition-colors outline-none ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby="name-error"
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1 flex items-center"
              >
                <FaEnvelope className="mr-2 text-blue-500" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className={`w-full px-4 py-3 rounded-lg border text-gray-900 placeholder-gray-400 transition-colors outline-none ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby="email-error"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-700 mb-1 flex items-center"
              >
                <FaPhoneAlt className="mr-2 text-blue-500" />
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register("phone")}
                className={`w-full px-4 py-3 rounded-lg border text-gray-900 placeholder-gray-400 transition-colors outline-none ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                aria-invalid={errors.phone ? "true" : "false"}
                aria-describedby="phone-error"
              />
              {errors.phone && (
                <p id="phone-error" className="mt-1 text-sm text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isDirty || !isValid}
              className={`w-full py-3 rounded-md font-semibold text-white transition ${
                isSubmitting || !isDirty || !isValid
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Join Waitlist"}
            </button>

            <p className="text-xs text-gray-500 text-center mt-2 select-none">
              We respect your privacy. No spam, ever.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
