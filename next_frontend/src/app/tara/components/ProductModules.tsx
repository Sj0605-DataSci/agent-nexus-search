"use client";

import React, { useState, useEffect, useRef } from "react";

const modules = [
  {
    name: "AI Chat",
    title: "AI-Powered Conversational Accounting",
    description:
      "Create and update Tally entries using natural language. Tara understands your commands, eliminating complex menus and formats.",
  },
  {
    name: "Invoice Automation",
    title: "Touchless Invoice & Document Processing",
    description:
      "Upload any invoice (photo, PDF, or Excel) and watch as Tara extracts and validates every detail for instant Tally entries.",
  },
  {
    name: "Live Analytics",
    title: "Real-Time Financial Dashboards",
    description:
      "Access live metrics on cash flow, receivables, and P&L. Make informed decisions with up-to-the-minute business insights.",
  },
  {
    name: "WhatsApp",
    title: "Tally Operations via WhatsApp",
    description:
      "Manage transactions, check stock, and get reports directly through WhatsApp, ensuring your business runs 24/7.",
  },
];

const ProductModules = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      setActiveTab(prevTab => (prevTab + 1) % modules.length);
    }, 1500);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    if (!isHovered) {
      startInterval();
    } else {
      stopInterval();
    }

    return () => stopInterval();
  }, [isHovered]);

  return (
    <section id="modules" className="bg-white text-gray-800">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center text-center lg:text-left">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 self-center lg:self-start">
              Core Modules
            </span>
            <h2 className="mt-6 text-4xl font-bold sm:text-5xl">
              Customized Workflows <span className="text-gray-400 font-light">for You</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tara's modules are tailored to your business needs, ensuring every accounting task is
              optimized for speed and accuracy.
            </p>
            <a
              href="#"
              className="mt-8 inline-block self-center rounded-full bg-gray-900 px-8 py-4 text-sm font-medium text-white transition hover:bg-gray-700 lg:self-start"
            >
              Explore Features
            </a>
          </div>

          <div className="flex flex-col items-center">
            <div className="mb-8 flex flex-wrap justify-center gap-2 rounded-full bg-gray-100 p-2 sm:flex-wrap md:flex-nowrap">
              {modules.map((module, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === index ? "bg-white text-gray-800 shadow-sm" : "bg-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  {module.name}
                </button>
              ))}
            </div>

            <div className="relative h-[380px] w-full max-w-sm rounded-[30px] border-8 border-gray-900 bg-gray-50 p-4 shadow-2xl overflow-hidden">
              <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative h-full w-full"
              >
                {modules.map((module, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-500 ease-in-out ${activeTab === index ? "opacity-100" : "opacity-0"}`}
                  >
                    <p className="text-lg font-semibold text-gray-400">{module.name}</p>
                    <h3 className="mt-2 text-2xl font-bold text-gray-900">{module.title}</h3>
                    <p className="mt-4 text-gray-600">{module.description}</p>
                    {/* <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8">
                      <p className="text-gray-400">Visual Representation</p>
                    </div> */}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductModules;
