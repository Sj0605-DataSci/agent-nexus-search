import React from "react";
import Link from "next/link";
import Image from "next/image";

const HeroHeader = () => {
  return (
    <section className="relative pt-40 pb-0" aria-label="Hero section">
      <div className="relative z-10">
        <div className="max-w-6xl items-center px-4 sm:px-6 lg:px-8 mx-auto">
          <header className="text-center">
            <h1 className="text-4xl md:text-6xl font-medium max-w-[90%] mx-auto text-gray-900 mb-6">
              Unlock Hidden Opportunities within Your Trusted Networks
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              AI that maps your network, delivers warm intros effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <Link
                href="/#waitlist-email"
                className="px-8 py-3 text-lg font-medium rounded-xl text-white bg-[#0E3D15] hover:bg-[#1F3A21] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-102 hover:-translate-y-0.5 active:translate-y-0"
                aria-label="Join waitlist"
              >
                Join waitlist
              </Link>
              <Link
                href="https://calendly.com/founders-discoverminds/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 text-lg font-medium rounded-xl text-gray-700 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                aria-label="Book a demo"
              >
                Book a demo
              </Link>
            </div>
          </header>
          <section
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
            aria-labelledby="trusted-partners"
          >
            <h2
              id="trusted-partners"
              className="text-sm font-semibold text-gray-500 mb-8 tracking-wide"
            >
              TRUSTED BY USERS FROM
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-80">
              {["Adobe", "Cargill", "Google", "Juspay", "Meta", "Salesforce"].map(company => (
                <div key={company} className="h-8 md:h-10 relative w-auto">
                  <Image
                    src={`/logos/TrustedPartners/${company}.webp`}
                    alt={company}
                    className="h-full w-auto object-contain"
                    width={100}
                    height={40}
                    priority={true}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default HeroHeader;
