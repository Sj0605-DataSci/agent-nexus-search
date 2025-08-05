"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import "aos/dist/aos.css";
import BrandLogo from "../BrandLogo";

const DiscovermindsLogo: React.FC = () => {
  return (
    <Link
      href="/"
      className="flex items-center gap-2  mt-2 sm:gap-2.5 group"
      aria-label="Discoverminds Home"
    >
      <BrandLogo className="mb-3" />
    </Link>
  );
};

interface MobileMenuIconProps {
  isOpen: boolean;
  onClick: () => void;
}

const MobileMenuIcon = ({ isOpen, onClick }: MobileMenuIconProps) => (
  <button
    onClick={onClick}
    className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors duration-300"
    aria-label={isOpen ? "Close menu" : "Open menu"}
    data-aos="fade-left"
    data-aos-duration="600"
    data-aos-delay="200"
  >
    <div className="w-5 h-5 flex flex-col justify-center items-center">
      <span
        className={`block h-0.5 w-5 bg-current transition-all duration-300 ${
          isOpen ? "rotate-45 translate-y-0.5" : ""
        }`}
      />
      <span
        className={`block h-0.5 w-5 bg-current transition-all duration-300 mt-1 ${
          isOpen ? "opacity-0" : ""
        }`}
      />
      <span
        className={`block h-0.5 w-5 bg-current transition-all duration-300 mt-1 ${
          isOpen ? "-rotate-45 -translate-y-1.5" : ""
        }`}
      />
    </div>
  </button>
);

interface NavLink {
  name: string;
  href: string;
  isButton?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { name: "Pricing", href: "/pricing" },
  { name: "Get Started", href: "/signup", isButton: true },
];

const HomeHeader: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && !(event.target as Element).closest("header")) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={`fixed left-0 top-0 right-0 z-50 mt-6 backdrop-blur-md bg-background/85 shadow-none
        }`}
      >
        <div className="mx-auto flex h-16 sm:h-[60px] max-w-[1200px] items-center justify-between px-4 sm:px-5 lg:px-6 xl:px-6">
          <BrandLogo className="" />
          <nav className="hidden md:block">
            <ul className="flex items-center gap-6 lg:gap-8">
              {NAV_LINKS.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`relative transition-all duration-300 group ${
                      link.isButton
                        ? "px-4 py-2 lg:px-6 lg:py-2.5 bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] text-white font-medium rounded-full hover:opacity-90 hover:scale-105 shadow-lg transform transition-all duration-300 hover:-translate-y-0.5"
                        : "text-sm lg:text-base font-medium text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Menu Button */}
          <MobileMenuIcon
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Menu */}
        <nav
          className={`absolute top-16 sm:top-[72px] left-0 right-0 bg-background/95 backdrop-blur-md border-b border-gray-200/20 shadow-lg transition-all duration-300 ${
            isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          <ul className="py-4 px-4 sm:px-6 space-y-2">
            {NAV_LINKS.map((link, index) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={`block px-4 py-3 font-medium transition-all duration-300 rounded-lg group ${
                    link.name === "Login"
                      ? "text-base text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
                      : link.isButton
                        ? "bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] text-white text-center hover:opacity-90"
                        : "text-base text-text-secondary hover:text-text-primary hover:bg-gray-50/50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    animationDelay: isMobileMenuOpen ? `${index * 100}ms` : "0ms",
                  }}
                >
                  <span
                    className={`flex items-center ${link.isButton ? "justify-center" : "gap-2"}`}
                  >
                    {link.name}
                    {!link.isButton && (
                      <span className="w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-4" />
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default HomeHeader;
