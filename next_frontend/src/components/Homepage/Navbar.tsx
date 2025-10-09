"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import BrandLogo from "../BrandLogo";
import { motion, AnimatePresence } from "framer-motion";
import Analytics from "@/utils/analytics";
import { usePathname } from "next/navigation";

interface MobileMenuIconProps {
  isOpen: boolean;
  onClick: () => void;
}

const MobileMenuIcon = ({ isOpen, onClick }: MobileMenuIconProps) => (
  <button
    onClick={onClick}
    className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
    aria-label={isOpen ? "Close menu" : "Open menu"}
  >
    <div className="w-5 h-5 flex flex-col justify-center items-center relative">
      <span
        className={`block h-0.5 w-5 bg-current absolute transition-all duration-300 ${
          isOpen ? "rotate-45" : "-translate-y-1"
        }`}
      />
      <span
        className={`block h-0.5 w-5 bg-current absolute transition-all duration-300 ${
          isOpen ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`block h-0.5 w-5 bg-current absolute transition-all duration-300 ${
          isOpen ? "-rotate-45" : "translate-y-1"
        }`}
      />
    </div>
  </button>
);

const NAV_LINKS = [
  { name: "Why DiscoverMinds", href: "/#why-discoverminds" },
  { name: "Pricing", href: "/pricing" },
];

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const handleSectionLinkClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();

    const section = document.getElementById(sectionId);

    Analytics.trackButtonClick(`${sectionId}_scroll`, {
      location: "navbar",
      source: "nav_link",
    });

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (pathname !== "/") {
      // If we're not on the homepage, navigate to homepage first
      window.location.href = `/${sectionId}`;
    }
  };
  // Handle scroll visibility with debouncing using RAF
  useEffect(() => {
    let rafId: number | null = null;
    let lastKnownScrollY = 0;

    const handleScroll = () => {
      lastKnownScrollY = window.scrollY;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          const currentScrollY = lastKnownScrollY;

          if (currentScrollY > 200) {
            setIsVisible(currentScrollY < lastScrollY);
          } else {
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          rafId = null;
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [lastScrollY]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle body scroll lock
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Memoize nav links to prevent re-renders
  const navLinks = useMemo(
    () =>
      NAV_LINKS.map(link => (
        <Link
          key={link.name}
          prefetch={true}
          href={link.href}
          className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 relative group px-2 py-1 rounded focus:outline-none cursor-pointer"
        >
          {link.name}
          <span className="absolute bottom-0 left-2 w-0 h-0.5 bg-[#EFFBD7] transition-all duration-300 group-hover:w-[calc(100%-1rem)]" />
        </Link>
      )),
    []
  );

  // Memoize mobile menu links
  const mobileNavLinks = useMemo(
    () =>
      NAV_LINKS.map(link => (
        <li key={link.name}>
          <Link
            href={link.href}
            className="block mx-2 my-1 px-4 py-3 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {link.name}
          </Link>
        </li>
      )),
    []
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          className="fixed inset-x-0 top-0 z-50 pt-6 px-4 sm:px-6"
          initial={{ opacity: 1, transform: "translateY(0)" }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          exit={{ opacity: 0, transform: "translateY(-100%)" }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="hidden w-full justify-center items-center md:flex">
            <div className=" bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 w-full self-center  max-w-6xl -ml-3 ">
              <div className="flex h-16 items-center justify-between px-6">
                <BrandLogo />

                <nav className="flex items-center gap-8">{navLinks}</nav>

                <MobileMenuIcon isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
              </div>
            </div>
          </div>

          <div className="block md:hidden">
            <div className="flex bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 h-16 px-2 items-center justify-between">
              <BrandLogo />
              <MobileMenuIcon isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                className="fixed inset-0 z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                />

                <motion.nav
                  className="absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-xl overflow-hidden"
                  initial={{ transform: "translateY(-20px)", opacity: 0 }}
                  animate={{ transform: "translateY(0)", opacity: 1 }}
                  exit={{ transform: "translateY(-20px)", opacity: 0 }}
                  transition={{ type: "spring", damping: 25 }}
                  style={{ willChange: "transform, opacity" }}
                >
                  <ul className="py-2">{mobileNavLinks}</ul>
                </motion.nav>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  );
};

export default Navbar;
