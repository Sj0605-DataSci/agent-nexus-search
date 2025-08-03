"use client";
import React, { useState, useTransition, ChangeEvent } from "react";
import BrandLogo from "./BrandLogo";
import Link from "next/link";
import { FiUser, FiMail, FiPhone, FiLoader } from "react-icons/fi";
import { FaLinkedin } from "react-icons/fa";
import { useRouter } from "next/navigation";

interface InputFieldProps {
  id: string;
  type: string;
  placeholder: string;
  name: string;
  icon: React.ReactNode;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const CompactInputField: React.FC<InputFieldProps> = ({
  id,
  type,
  placeholder,
  name,
  icon,
  required = false,
  error,
  value,
  onChange,
}) => (
  <div className="mb-3 ">
    <div className="relative">
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className={`w-full pl-10 pr-3 py-3 rounded-lg border outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 ${
          error ? "border-red-200" : "border-gray-300 hover:border-gray-400"
        }`}
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
    </div>
    <div className=" mb-[4px] px-1 h-1">
      {error && (
        <div className="flex items-center">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}
    </div>
  </div>
);

const SuccessState = () => (
  <div className="text-center py-6 animate-fadeIn">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 bg-green-100 animate-pulse-slow">
      <svg
        className="w-10 h-10 text-green-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h2 className="text-2xl font-bold mb-3 text-gray-900">You're on the list!</h2>

    <div className="bg-blue-50 rounded-lg p-4 mb-5 max-w-xs mx-auto">
      <p className="text-gray-700 text-sm mb-2">
        <span className="font-medium">What happens next?</span>
      </p>
      <ol className="text-left text-sm text-gray-600 space-y-2 pl-5 list-decimal">
        <li>We'll review your application</li>
        <li>You'll receive an email confirmation</li>
        <li>We'll notify you when you're granted access</li>
      </ol>
    </div>

    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
      <Link
        href="/"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
      >
        Back to Home
      </Link>
      <a
        href="https://www.linkedin.com/company/discoverminds/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
      >
        <FaLinkedin className="mr-2" size={16} />
        Follow Us
      </a>
    </div>

    <p className="text-gray-500 text-xs">
      Have questions? Contact us at{" "}
      <a href="mailto:support@discoverminds.ai" className="text-blue-600 hover:underline">
        support@discoverminds.ai
      </a>
    </p>
  </div>
);

interface FormState {
  name: string;
  email: string;
  phone: string;
  linkedin_url: string;
}

const NewAnimatedWaitlist: React.FC<{ showSuccess?: boolean }> = ({ showSuccess = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(showSuccess);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    linkedin_url: "",
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (data: FormState): Record<string, string> => {
    const errors: Record<string, string> = {};

    const { name, email, phone, linkedin_url: linkedinUrl } = data;

    if (!name || name.length < 2) {
      errors.name = "Full name is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phone) {
      errors.phone = "Phone number is required";
    } else if (!phoneRegex.test(phone)) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }

    const linkedinRegex =
      /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company|school|pub|profile)\/[A-Za-z0-9\-_%\.]+\/?.*$/i;

    if (!linkedinUrl) {
      errors.linkedin_url = "LinkedIn profile URL is required";
    } else if (!linkedinRegex.test(linkedinUrl)) {
      errors.linkedin_url = "Please enter a valid LinkedIn URL (e.g., linkedin.com/in/username)";
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitFormData.append(key, value);
      });

      const response = await fetch("/api/waitlist", {
        method: "POST",
        body: submitFormData,
      });

      if (response.redirected) {
        startTransition(() => {
          router.push(response.url);
        });
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ submit: result.error });
        } else {
          setErrors({ submit: result.error || "Something went wrong. Please try again." });
        }
      } else {
        setSuccess(true);
      }
    } catch (error) {
      setErrors({ submit: "Network error. Please check your connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isSubmitting || isPending;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-purple-100/20 pointer-events-none" />

      <div className="absolute top-4 right-4 z-20 flex items-center space-x-3">
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1"
        >
          Login
        </Link>
        <Link href="/signup">
          <button
            className="px-3 py-1.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow"
            type="button"
          >
            Sign Up
          </button>
        </Link>
      </div>

      <main className="relative z-10 w-full max-w-sm rounded-2xl shadow-xl bg-white/95 backdrop-blur-sm border border-gray-200/50 p-6">
        {success ? (
          <SuccessState />
        ) : (
          <div>
            <div className="text-start mb-4">
              <BrandLogo className="mb-3" />
              <h1 className="text-xl font-bold mb-1 text-gray-900">Join the Waitlist</h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                Reimagine how you find the perfect hire or your perfect lead — smarter, faster, more
                personal.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <CompactInputField
                id="name"
                name="name"
                type="text"
                placeholder="Full Name"
                icon={<FiUser size={16} className="text-gray-400" />}
                required
                error={errors.name}
                value={formData.name}
                onChange={handleInputChange}
              />

              <CompactInputField
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                icon={<FiMail size={16} className="text-gray-400" />}
                required
                error={errors.email}
                value={formData.email}
                onChange={handleInputChange}
              />

              <CompactInputField
                id="phone"
                name="phone"
                type="tel"
                placeholder="10-digit Phone Number"
                icon={<FiPhone size={16} className="text-gray-400" />}
                required
                error={errors.phone}
                value={formData.phone}
                onChange={e => {
                  // Only allow digits and limit to 10 characters
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFormData(prev => ({ ...prev, phone: value }));
                }}
              />

              <CompactInputField
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                placeholder="LinkedIn Profile URL"
                icon={<FaLinkedin size={16} className="text-gray-400" />}
                required
                error={errors.linkedin_url}
                value={formData.linkedin_url}
                onChange={handleInputChange}
              />

              {errors.submit && (
                <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600">{errors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isButtonDisabled}
                // className="w-full py-3 rounded-lg font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                  isButtonDisabled
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white shadow-lg"
                }`}
              >
                {isButtonDisabled ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiLoader className="animate-spin" size={16} />
                    Submitting...
                  </span>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </form>

            <p className="text-xs text-center text-gray-500 mb-4 mt-2">
              We respect your privacy. No spam, ever.
            </p>

            <div className="flex items-center justify-center gap-2">
              <div className="flex -space-x-1">
                <img
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt=""
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  loading="lazy"
                />
                <img
                  src="https://randomuser.me/api/portraits/women/44.jpg"
                  alt=""
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  loading="lazy"
                />
                <img
                  src="https://randomuser.me/api/portraits/men/45.jpg"
                  alt=""
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  loading="lazy"
                />
              </div>
              <span className="text-xs font-medium text-blue-700 ml-2">
                55+ users already joined
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewAnimatedWaitlist;
