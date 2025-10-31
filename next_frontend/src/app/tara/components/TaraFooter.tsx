"use client";

import Link from "next/link";
import { FaTwitter, FaLinkedin } from "react-icons/fa";
import Analytics from "@/utils/analytics";

const footerLinks = {
  tara: [
    { name: "Features", href: "/tara#features" },
    { name: "Pricing", href: "/tara#pricing" },
    { name: "How it Works", href: "/tara#how-it-works" },
  ],
  product: [
    { name: "AI Chat", href: "/tara#modules" },
    { name: "Invoice Automation", href: "/tara#modules" },
    { name: "Live Analytics", href: "/tara#modules" },
    { name: "WhatsApp Integration", href: "/tara#modules" },
    { name: "Testimonials", href: "/tara#testimonials" },
    { name: "FAQ", href: "/tara#faq" },
    { name: "Get Started", href: "/contact" },
  ],
  resources: [
    // { name: "Guide", href: "/docs/guide" },
    // { name: "Blog", href: "/blog" },
    { name: "Contact Us", href: "/contact" },
  ],
};

export default function TaraFooter() {
  const handleLinkClick = (linkName: string, category: string) => {
    Analytics.trackButtonClick("footer_link", {
      link_name: linkName,
      link_category: category,
      page: "tara_landing",
    });
  };

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Tara</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Guide your business through accounting operations with conversational AI.
            </p>
          </div>

          {/* Tara Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Tara
            </h3>
            <ul className="space-y-3">
              {footerLinks.tara.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => handleLinkClick(link.name, "tara")}
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Features
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => handleLinkClick(link.name, "features")}
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => handleLinkClick(link.name, "resources")}
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-8">
          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Copyright */}
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600">
                &copy; {new Date().getFullYear()} DiscoverMinds. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">Tara - AI Copilot for TallyPrime</p>
            </div>

            {/* Center: Legal Links */}
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy-policy"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
                Terms of Service
              </Link>
            </div>

            {/* Right: Social Links */}
            <div className="flex gap-4">
              <a
                href="https://twitter.com/Discover_Minds"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Follow DiscoverMinds on Twitter"
                onClick={() =>
                  Analytics.trackButtonClick("social_link", {
                    platform: "twitter",
                    location: "tara_footer",
                  })
                }
              >
                <FaTwitter size={18} />
              </a>
              <a
                href="https://www.linkedin.com/company/discover-minds"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Visit DiscoverMinds on LinkedIn"
                onClick={() =>
                  Analytics.trackButtonClick("social_link", {
                    platform: "linkedin",
                    location: "tara_footer",
                  })
                }
              >
                <FaLinkedin size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
