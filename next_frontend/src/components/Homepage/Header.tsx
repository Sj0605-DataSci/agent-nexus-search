"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import BrandLogo from "../BrandLogo";
import { motion, AnimatePresence } from "framer-motion";

interface MobileMenuIconProps {
  isOpen: boolean;
  onClick: () => void;
}

const MobileMenuIcon = ({ isOpen, onClick }: MobileMenuIconProps) => (
  <button
    onClick={onClick}
    className="md:hidden p-2 ml-2 text-text-secondary hover:text-text-primary transition-colors duration-300"
    aria-label={isOpen ? "Close menu" : "Open menu"}
  >
    <div className="w-5 h-5 flex flex-col justify-center items-center relative">
      <span
        className={`block h-0.5 w-5 bg-current absolute transition-all duration-300 ${
          isOpen ? "rotate-45 translate-y-0" : "transform -translate-y-1"
        }`}
      />
      <span
        className={`block h-0.5 w-5 bg-current absolute transition-all duration-300 ${
          isOpen ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`block h-0.5 w-5 bg-current absolute transition-all duration-300 ${
          isOpen ? "-rotate-45 translate-y-0" : "transform translate-y-1"
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
  // { name: "Examples", href: "/examples" },
  // { name: "About", href: "/about" },
  // { name: "Join Waitlist", href: "/join-waitlist", isButton: true },
];

const HomeHeader: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 200) {
        if (currentScrollY > lastScrollY) {
          // Scrolling down
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);
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
    <AnimatePresence>
      {isVisible && (
        <motion.header
          ref={headerRef}
          className="fixed left-0 top-0 right-0 z-50 pt-6 px-6"
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          transition={{ type: "spring", damping: 10, stiffness: 50 }}
        >
          <motion.div
            className="mx-auto max-w-6xl bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100"
            whileHover={{ backgroundColor: "rgba(255,255,255,1)" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex h-16 items-center justify-between px-6">
              <BrandLogo className="hover:scale-105 transition-transform duration-300" />

              <nav className="hidden md:block">
                <ul className="flex items-center gap-8">
                  {NAV_LINKS.filter(link => !link.isButton).map(link => (
                    <motion.li
                      key={link.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        href={link.href}
                        className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 relative group"
                      >
                        {link.name}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0E3D15] transition-all duration-300 group-hover:w-full" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* Right CTA Button
              <div className="hidden md:block">
                {NAV_LINKS.filter(link => link.isButton).map(link => (
                  <motion.div
                    key={link.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href={link.href}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] text-white font-semibold rounded-full hover:shadow-lg transition-all duration-200"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
              </div> */}

              {/* Mobile Menu Button */}
              <MobileMenuIcon
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>
          </motion.div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                className="fixed inset-0 z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Backdrop */}
                <motion.div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />

                {/* Mobile Menu Content */}
                <motion.nav
                  className="absolute top-16 sm:top-[72px] left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200/20 shadow-lg"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: "spring", damping: 25 }}
                >
                  <ul className="py-4 px-4 sm:px-6 space-y-2">
                    {NAV_LINKS.map((link, index) => (
                      <motion.li
                        key={link.name}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 300,
                        }}
                      >
                        <Link
                          href={link.href}
                          className={`block px-4 py-3 font-medium transition-all duration-300 rounded-lg group ${
                            link.isButton
                              ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white text-center"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
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
                      </motion.li>
                    ))}
                  </ul>
                </motion.nav>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  );
};

export default HomeHeader;
