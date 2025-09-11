"use client";

import React, { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";

interface FaqItemData {
  question: string;
  answer: JSX.Element;
}

const faqData: FaqItemData[] = [
  {
    question: "What is DiscoverMinds.ai?",
    answer: (
      <>
        <p>
          DiscoverMinds.ai brings all your professional contacts - LinkedIn, Twitter, and personal,
          into one smart, searchable hub. Easily find the right people and unlock new opportunities
          through trusted connections.
        </p>
      </>
    ),
  },
  {
    question: "Is this free?",
    answer: (
      <>
        <p>
          Yes! Our <strong>Hunter Plan</strong> is completely free and gives you access to the core
          DiscoverMinds search functionality. For users who need more advanced features, we offer a{" "}
          <strong>Pro Plan</strong> with unlimited capabilities.
        </p>
      </>
    ),
  },
  {
    question: "Is my data secure?",
    answer: (
      <>
        <p>
          Absolutely. We are privacy-first by design. You own your data, period. We provide granular
          permissions that give you full control over what you share and who can see it. All sharing
          is opt-in and can be revoked at any time. Furthermore, introductions only happen when both
          parties agree, ensuring all connections are welcome and respectful.
        </p>
      </>
    ),
  },
  {
    question: "How do I connect accounts?",
    answer: (
      <>
        <p>
          You can seamlessly import and sync contacts from your professional platforms including
          LinkedIn, Twitter, and Gmail with a single click. This creates a centralized view of all
          your connections in one place, creating a single source of truth for your professional
          network.
        </p>
      </>
    ),
  },
  {
    question: "What are friends and groups?",
    answer: (
      <>
        <p>
          You can invite trusted friends and colleagues to a <strong>group</strong> for mutual
          network sharing. It’s a reciprocal system: you give access to your network and get access
          in return. This creates a powerful, shared pool of opportunities that benefits everyone
          involved.
        </p>
      </>
    ),
  },
  {
    question: "Is DiscoverMinds.ai affiliated with third-party services?",
    answer: (
      <>
        <p>
          DiscoverMinds.ai is an independent platform. We integrate with third-party services like
          LinkedIn, Twitter, and Gmail to help you unify your contacts. We also plan to offer
          integrations with tools like Slack, Discord, and CRMs to streamline your workflow, but we
          are not directly affiliated with any of these companies.
        </p>
      </>
    ),
  },
];

interface FaqItemProps {
  item: FaqItemData;
  isOpen: boolean;
  onClick: () => void;
}

const FaqItem = ({ item, isOpen, onClick }: FaqItemProps) => {
  return (
    <div className=" transition-all mb-6 duration-200 overflow-hidden">
      <button
        type="button"
        className="text-lg group flex flex-1 items-center  text-left font-medium transition-all hover:text-[#3B7DDD] w-full"
        onClick={onClick}
      >
        <span className=" text-xl font-bold text-[#B2DC8A]">
          {isOpen ? <FaMinus /> : <FaPlus />}
        </span>
        <span className="flex-1 pr-2 ml-4">{item.question}</span>
      </button>
      <div
        className={`grid transition-all ml-4 duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className=" px-6 text-base text-gray-700">{item.answer}</div>
        </div>
      </div>
    </div>
  );
};

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-14  text-gray-800 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 relative z-10">
        <div className="flex  mb-6">
          <h4 className="text-3xl font-bold text-center md:text-4xl">Got questions?</h4>
        </div>
        <div className="space-y-2 max-w-6xl mx-auto">
          {faqData.map((item, index) => (
            <div key={index}>
              <FaqItem
                item={item}
                isOpen={openIndex === index}
                onClick={() => handleClick(index)}
              />
              {index !== faqData.length - 1 && (
                <div className="w-full border-t mb-4 border-[#EFFBD7] mt-6"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
