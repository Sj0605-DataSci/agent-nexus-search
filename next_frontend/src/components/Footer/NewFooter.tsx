"use client";

import Link from "next/link";
import Image from "next/image";
import { FaTwitter, FaLinkedin } from "react-icons/fa";
import { useState } from "react";
import { apiClient } from "@/integrations/fastapi/client";
import toast from "react-hot-toast";
import Analytics from "@/utils/analytics";
import { useAnalytics } from "@/hooks/useAnalytics";

const footerLinks = {
  product: [
    { name: "Home", href: "/" },
    { name: "Pricing", href: "/pricing" },
    { name: "Get Started", href: "/user-auth" },
  ],
  company: [
    { name: "About us", href: "/about" },
    { name: "Careers", href: "https://www.linkedin.com/company/discover-minds/jobs/" },
    { name: "Contact us", href: "mailto:founders@discoverminds.ai" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms" },
  ],
};

export default function NewFooter() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { capture } = useAnalytics();

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    Analytics.trackFeatureUsage("email_validation", {
      is_valid: isValid,
      component: "footer_waitlist",
    });

    return isValid;
  };

  const handleWaitlistClick = async () => {
    const emailInput = document.getElementById("waitlist-email") as HTMLInputElement;

    if (emailInput) {
      const emailValue = emailInput.value.trim();

      Analytics.trackButtonClick("waitlist_submit", {
        location: "footer",
        has_email: emailValue !== "",
      });

      if (emailValue === "") {
        emailInput.focus();
        Analytics.trackError("waitlist_error", "Empty email field", {
          location: "footer",
        });
      } else {
        if (isValidEmail(emailValue)) {
          try {
            setIsSubmitting(true);

            capture("waitlist_submission_started", {
              location: "footer",
            });

            const response = await apiClient.joinWaitlistEmail(emailValue);

            if (response.success) {
              toast.success("You've been added to our waitlist!");
              emailInput.value = "";

              Analytics.trackFormSubmission("waitlist_form", {
                status: "success",
                location: "footer",
              });
            } else if (response.status_code === 409) {
              toast.success("You're already on our waitlist.");

              Analytics.trackFormSubmission("waitlist_form", {
                status: "already_joined",
                location: "footer",
              });
            } else {
              toast.error("Failed to join waitlist. Please try again later.");

              Analytics.trackError("waitlist_error", "API error", {
                status_code: response.status_code,
                location: "footer",
              });
            }
          } catch (error) {
            console.error("Error joining waitlist:", error);
            toast.error("Failed to join waitlist. Please try again later.");

            Analytics.trackError("waitlist_error", "Exception", {
              error_message: error instanceof Error ? error.message : String(error),
              location: "footer",
            });
          } finally {
            setIsSubmitting(false);
          }
        } else {
          toast.error("Please enter a valid email address.");
          emailInput.focus();

          Analytics.trackError("waitlist_error", "Invalid email format", {
            location: "footer",
          });
        }
      }
    }
  };

  return (
    <footer className="bg-[#0E3D15] pt-16 px-3">
      <div className="max-w-6xl mx-auto px-4 lg:px-0  py-20 bg-white items-center rounded-xl flex flex-col">
        <h2 className="text-[32px] font-medium text-gray-900 mb-4">
          Make your warm intro more impactful
        </h2>
        <p className="text-gray-600 text-md  mb-10">
          AI that maps your network, delivers warm intros effortlessly.
        </p>
        <div className="flex flex-col  w-full items-center justify-center max-w-md gap-3">
          <div className="relative max-w-[380px] w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-500"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 2-8.4 7.05a1 1 0 0 1-1.2 0L1 2m18 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1m18 0v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2"
                />
              </svg>
            </div>
            <input
              id="waitlist-email"
              type="email"
              placeholder="Enter your email address"
              aria-label="Email address"
              className="w-full pl-10 px-4 py-3 h-[50px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-200"
            />
          </div>
          <button
            onClick={handleWaitlistClick}
            disabled={isSubmitting}
            className={`w-full max-w-[380px]  whitespace-nowrap h-[50px] px-6 py-3 text-base font-medium rounded-lg text-white ${isSubmitting ? "bg-[#1F3A21] cursor-not-allowed" : "bg-[#0E3D15] hover:bg-[#1F3A21] transform hover:-translate-y-0.5 active:translate-y-0"} transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              "Join Waitlist"
            )}
          </button>
        </div>
        <p className="text-[#0E3D15] text-sm mt-2">No spam, promise</p>
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-0 pt-16 pb-8 flex flex-col md:flex-row justify-between">
        <div className="w-full flex flex-col md:flex-row justify-between">
          <div className="mb-8 md:mb-0">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              PRODUCT
            </h3>
            <ul className="space-y-2">
              {footerLinks.product.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => {
                      Analytics.trackButtonClick("footer_link", {
                        link_name: link.name,
                        link_category: "product",
                        link_url: link.href,
                      });
                    }}
                    prefetch={true}
                    className="text-white hover:text-gray-300"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-8 md:mb-0">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              COMPANY
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => {
                      Analytics.trackButtonClick("footer_link", {
                        link_name: link.name,
                        link_category: "company",
                        link_url: link.href,
                      });
                    }}
                    prefetch={true}
                    className="text-white hover:text-gray-300"
                    target={
                      link.href.startsWith("http") || link.href.startsWith("mailto:")
                        ? "_blank"
                        : undefined
                    }
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-8 md:mb-0">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              LEGAL
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map(link => (
                <li key={link.name}>
                  <Link href={link.href} prefetch={true} className="text-white hover:text-gray-300">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex w-full flex-col items-end">
          <div className="flex space-x-4">
            <a
              href="https://www.linkedin.com/company/discover-minds"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300"
              onClick={() => {
                Analytics.trackButtonClick("social_link", {
                  platform: "linkedin",
                  location: "footer",
                });
              }}
            >
              <FaLinkedin size={24} />
            </a>
            <a
              href="https://twitter.com/Discover_Minds"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300"
              onClick={() => {
                Analytics.trackButtonClick("social_link", {
                  platform: "twitter",
                  location: "footer",
                });
              }}
            >
              <FaTwitter size={24} />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full -mb-1 mx-auto flex justify-center bg-gradient-to-t from-[#0d3d15] to-transparent">
        <Image
          src="/logos/DiscoverMinds.ai.svg"
          alt="DiscoverMinds.ai"
          width={1191}
          height={128}
          className="w-full max-w-6xl h-auto"
          loading="lazy"
        />
      </div>
    </footer>
  );
}
