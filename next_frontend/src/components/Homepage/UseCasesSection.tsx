"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiUser, FiUsers, FiSearch } from "react-icons/fi";
import { BsMegaphone } from "react-icons/bs";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { queryToSlug } from "@/utils/urlHelpers";

const useCasesData = [
  {
    title: "Discovering",
    description: "See early-stage fintech founders in Delhi",
    icon: <BsMegaphone className="h-6 w-6 text-[#0E3D15]" />,
    buttonText: "Explore Founders",
  },
  {
    title: "Recruitment",
    description:
      "Search for experienced software engineers in Bengaluru with 3+ Years of experience.",
    icon: <FiUser className="h-6 w-6 text-[#0E3D15]" />,
    buttonText: "Discover Talent",
  },
  {
    title: "Reaching",
    description: "Show me operations managers and sales leads at growing startups in Delhi.",
    icon: <FiSearch className="h-6 w-6 text-[#0E3D15]" />,
    buttonText: "Identify Prospects",
  },
  {
    title: "Sales",
    description: "Get a list of product managers at mid-sized Mumbai startups.",
    icon: <FiUsers className="h-6 w-6 text-[#0E3D15]" />,
    buttonText: "Connect with PMs",
  },
];

const UseCasesSection = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleUseCaseClick = (label: string, index: number) => {
    if (loading) return;

    setLoading(true);
    setLoadingIndex(index);

    if (label?.trim()) {
      router.push(`/user-query?q=${queryToSlug(label?.trim())}`);
    }

    setTimeout(() => {
      setLoading(false);
      setLoadingIndex(null);
    }, 3000);
  };

  return (
    <div className="mt-7 max-w-6xl px-4 lg:px-0 mx-auto sm:mt-12">
      <div className="text-center">
        <h2 className="text-4xl font-medium tracking-tight text-[#0E3D15] sm:text-5xl">
          Designed for your use cases
        </h2>
      </div>
      <div className="mx-auto mt-5 sm:mt-5 lg:mt-10 w-full grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {useCasesData.map((useCase, index) => (
          <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-md">
            <div className="p-4 sm:p-6 flex flex-col h-full text-center">
              <div className="flex flex-col h-full">
                <div className="flex justify-center mb-4">{useCase.icon}</div>
                <h3 className="text-xl sm:text-2xl font-medium text-[#0E3D15] mb-2 sm:mb-3">
                  {useCase.title}
                </h3>
                <p className="text-sm text-gray-700 mb-4 sm:mb-6">"{useCase.description}"</p>
              </div>
              <button
                onClick={() => handleUseCaseClick(useCase.description, index)}
                disabled={loading}
                className={`bg-[#EFFBD7] text-[#0E3D15] px-4 sm:px-6 py-2 rounded-md text-sm sm:text-base font-medium transition-colors relative ${loading && loadingIndex === index ? "cursor-not-allowed opacity-90" : "hover:bg-[#D9F9B0]"}`}
              >
                <div className="flex items-center justify-center relative">
                  <span className={loading && loadingIndex === index ? "opacity-20" : ""}>
                    {useCase.buttonText}
                  </span>
                  {loading && loadingIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin text-[#0E3D15]" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UseCasesSection;
