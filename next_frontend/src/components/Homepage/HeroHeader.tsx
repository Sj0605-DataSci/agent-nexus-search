import React from "react";
import Link from "next/link";
import Image from "next/image";

const companyLogos = [
  { name: "Adobe", width: 80, height: 40 },
  // { name: "Cargill", width: 100, height: 40 },
  { name: "Google", width: 100, height: 40 },
  { name: "Juspay", width: 100, height: 40 },
  { name: "Meta", width: 80, height: 40 },
  { name: "Salesforce", width: 60, height: 24 },
] as const;

const HeroHeader = () => {
  return (
    <section className="relative pt-40 pb-0 hero-section" aria-label="Hero section">
      <div className="relative z-10">
        <div className="max-w-6xl items-center px-4 sm:px-6 lg:px-8 mx-auto">
          <header className="text-center">
            <h1 className="text-4xl md:text-6xl font-medium max-w-[100%] mx-auto text-gray-900 mb-6">
              Your Secret Weapon for Professional Networking
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              AI that maps your network, delivers warm intros effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <Link
                href="/user-auth"
                prefetch={false}
                className="px-8 py-3 text-lg font-medium rounded-xl text-white bg-[#0E3D15] hover:bg-[#1F3A21] transition-colors duration-200 shadow-lg hover:shadow-xl"
                aria-label="Get Started"
              >
                Get Started
              </Link>
              <Link
                href="https://calendly.com/founders-discoverminds/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 text-lg font-medium rounded-xl text-gray-700 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200 shadow-sm hover:shadow-md"
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
              {companyLogos.map(company => (
                <div key={company.name} className="h-8 md:h-9 relative">
                  <Image
                    src={`/logos/TrustedPartners/${company.name}.webp`}
                    alt={`${company.name} logo`}
                    className="object-contain"
                    width={company.width}
                    height={company.height}
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 768px) 80px, 120px"
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
