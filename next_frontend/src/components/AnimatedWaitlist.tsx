"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Confetti from "react-confetti";
import { AnimatePresence } from "framer-motion";
import { FaUser, FaEnvelope, FaPhoneAlt } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
import { useWindowSize } from "@/constant/styles/useWindowSize";

const schema = yup.object().shape({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
  email: yup.string().required("Email is required").email("Please enter a valid email address"),
  phone: yup
    .string()
    .required("Phone number is required")
    .matches(/^\+?[0-9\s-()]{10,}$/, "Please enter a valid phone number"),
});

export default function AnimatedWaitlist() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, height } = useWindowSize();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const onSubmit = async (formData: { name: string; email: string; phone: string }) => {
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
            toast.error("This email is already registered");
          } else if (error.message.includes("phone_number")) {
            toast.error("This phone number is already registered");
          }
        } else {
          setSubmitError("Oops! Something went wrong.");
        }
        return;
      }

      toast.success("Successfully joined the waitlist!");
      setIsSuccess(true);
      reset();
    } catch (e) {
      setSubmitError("Oops! Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6">
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

      <main className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 relative overflow-hidden">
        <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-2">
          Join the Waitlist
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Reimagine how you find the perfect hire or your perfect lead smarter, faster, more
          personal.
        </p>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">You're on the list!</h2>
            <p className="text-gray-600">
              Thank you for joining our waitlist. We'll be in touch soon!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
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
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
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
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
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
              />
              {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
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

            {submitError && <p className="text-sm text-red-600 text-center mt-2">{submitError}</p>}

            <p className="text-xs text-gray-500 text-center mt-2 select-none">
              We respect your privacy. No spam, ever.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
