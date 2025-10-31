"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "/tara#hero" },
    { name: "Features", href: "/tara#features" },
    { name: "How It Works", href: "/tara#how-it-works" },
    { name: "Pricing", href: "/tara#pricing" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 md:-ml-4 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/tara#hero" className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-900 font-bold text-base sm:text-lg">Tara</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6 lg:gap-8">
                {navLinks.map(link => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              {/* Desktop CTA Button */}
              <Link
                href="/contact?focus=firstName"
                className="hidden md:block bg-blue-500 text-white px-4 lg:px-6 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors text-sm flex-shrink-0 whitespace-nowrap"
              >
                Get Support
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden text-gray-900 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

            {/* Mobile Navigation */}
            {isOpen && (
              <div className="md:hidden mt-3 pt-3 border-t border-gray-200 pb-2">
                <div className="space-y-1">
                  {navLinks.map(link => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="block text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm font-medium py-2.5 px-3 rounded-lg"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
                                <Link
                  href="/contact?focus=firstName"
                  className="block bg-blue-500 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-blue-600 transition-colors text-sm text-center mt-3"
                  onClick={() => setIsOpen(false)}
                >
                  Get Support
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
