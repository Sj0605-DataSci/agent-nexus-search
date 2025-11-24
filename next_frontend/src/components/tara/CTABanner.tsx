import React from "react";

const CTABanner = () => {
  return (
    <section id="cta" className="bg-white">
      <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-2xl bg-gray-900 p-8 shadow-lg sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Try it now
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Ready to level up your accounting process?
              </h2>
              <p className="mt-4 text-gray-300">
                Supports small businesses with simple invoicing, powerful integrations, and cash
                flow management tools.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 lg:justify-end">
              <a
                href="/contact"
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring"
              >
                Get Started Now
              </a>
              <a
                href="/contact"
                className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring"
              >
                Learn More
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
