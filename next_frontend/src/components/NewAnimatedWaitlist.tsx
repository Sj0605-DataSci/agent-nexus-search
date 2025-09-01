"use client";
import React, { useState, useTransition, ChangeEvent } from "react";
import BrandLogo from "./BrandLogo";
import Link from "next/link";
import { FiUser, FiMail, FiPhone, FiLoader } from "react-icons/fi";
import { FaLinkedin } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { apiClient } from "@/integrations/fastapi/client";
import CountryCodeSelector from "./CountryCodeSelector";

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
    <div className="mt-1.5">
      {error && (
        <div className="bg-red-50/50 border border-red-100 rounded-md px-2.5 py-1 flex items-center">
          <svg
            className="w-3.5 h-3.5 text-red-400 mr-1.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-500/90 text-xs">{error}</p>
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
  const [fullPhoneNumber, setFullPhoneNumber] = useState("+91-");

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

    if (!phone) {
      errors.phone = "Phone number is required";
    }

    const linkedinRegex =
      /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|company|school|pub|profile|sales\/lead)\/[A-Za-z0-9\-_\.%]+(?:\/[-a-z\d%_.~+]*)*(?:\?[;&a-z\d%_.~+=-]*)?(?:\#[-a-z\d_]*)?$/i;

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
      const response = await apiClient.joinWaitlist({
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
        linkedin_url: formData.linkedin_url,
      });

      if (response.success) {
        setSuccess(true);
        if (response.data?.invitee_id) {
          console.log("Successfully joined waitlist with ID:", response.data.invitee_id);
        }
      } else {
        setErrors({ submit: response.message || "Failed to join waitlist. Please try again." });
      }
    } catch (error: any) {
      console.error("Error joining waitlist:", error);
      setErrors({
        submit: error.message || "An error occurred while joining the waitlist. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isSubmitting || isPending;
  return (
    <div className="flex items-center justify-center">
      <div className=" pointer-events-none" />

      {/* <div className="absolute top-4 right-4 z-20 flex items-center space-x-3">
        <Link
          href="/user-auth"
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
      </div> */}

      <main className="relative z-10 w-full  rounded-2xl">
        {success ? (
          <SuccessState />
        ) : (
          <div>
            <div className="text-start mb-4">
              {/* <BrandLogo className="mb-3" /> */}
              <h1 className="text-xl font-bold mb-1 text-gray-900">Join the Waitlist</h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tired of cold outreach? DiscoverMinds helps you make warm, meaningful connections
                through your extended network.
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

              <div className="relative mb-4">
                <CountryCodeSelector
                  value={fullPhoneNumber}
                  onChange={value => {
                    setFullPhoneNumber(value);
                    const digits = value.split("-")[1] || "";
                    setFormData(prev => ({ ...prev, phone: digits }));
                  }}
                  error={!!errors.phone}
                  currentError={errors.phone}
                  icon={<FiPhone size={16} className="text-gray-400" />}
                />
              </div>

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
                <div className="mb-3 px-2.5 py-1 rounded-md bg-red-50/50 border border-red-100 flex items-center">
                  <svg
                    className="w-3.5 h-3.5 text-red-400 mr-1.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-500/90 text-xs">{errors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isButtonDisabled}
                className={`w-full py-3.5 rounded-lg font-bold text-base transition-all duration-300 ${
                  isButtonDisabled
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-[#085157] hover:bg-[#064045] text-white shadow-md hover:shadow-lg"
                } focus:outline-none focus:ring-2 focus:ring-teal-300`}
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
                100+ users already joined
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewAnimatedWaitlist;
