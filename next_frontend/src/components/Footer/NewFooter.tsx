"use client";

import Link from "next/link";
import Image from "next/image";
import { FaTwitter, FaLinkedin } from "react-icons/fa";
import Analytics from "@/utils/analytics";

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
  return (
    <footer className="bg-[#0E3D15] pt-6 px-3">
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
              aria-label="Visit DiscoverMinds on LinkedIn"
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
              aria-label="Follow DiscoverMinds on Twitter"
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
