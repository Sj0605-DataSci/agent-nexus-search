import React, { useState } from "react";
import { FiMail, FiX, FiSend } from "react-icons/fi";
import { apiClient } from "@/integrations/fastapi/client";
import toast from "react-hot-toast";

interface GuestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
}

export default function GuestEmailModal({ isOpen, onClose, searchQuery }: GuestEmailModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.submitGuestSearchQuery(email, searchQuery);

      if (response.success || response.status_code === 409) {
        toast.success("Thanks! We'll send the results to your email shortly.", { duration: 4000 });
        setEmail("");
        onClose();
      } else {
        toast.error(response.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting email:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <FiX className="h-5 w-5" />
          </button>

          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <FiMail className="h-8 w-8" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">We'll Find Your Results</h2>
          <p className="text-blue-100 text-center text-sm">
            Our search is still processing. Share your email and we'll send you the results shortly.
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg  transition-all outline-none"
                required
                disabled={isSubmitting}
              />
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {searchQuery && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Your Search Query</p>
              <p className="text-sm text-gray-700 line-clamp-2">{searchQuery}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FiSend className="h-5 w-5" />
                Send Me Results
              </>
            )}
          </button>

          <p className="mt-4 text-xs text-center text-gray-500">
            We respect your privacy. Your email will only be used to send search results.
          </p>
        </form>
      </div>
    </div>
  );
}
