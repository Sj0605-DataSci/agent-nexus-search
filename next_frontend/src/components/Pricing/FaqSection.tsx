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
          DiscoverMinds.ai is a mutual network-sharing platform designed to unlock hidden
          opportunities within your professional extended network. It addresses the fragmentation of
          professional networks across platforms like LinkedIn, Twitter, and personal contacts,
          helping you leverage warm introductions to access the 70-85% of jobs and opportunities in
          the hidden market.
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
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <button
        type="button"
        className="text-lg group flex flex-1 items-center justify-between p-6 text-left font-medium transition-all hover:text-[#3B7DDD] w-full"
        onClick={onClick}
      >
        <span className="flex-1 pr-2">{item.question}</span>
        <span className="ml-2 text-xl font-bold text-[#4A89DC]">
          {isOpen ? <FaMinus /> : <FaPlus />}
        </span>
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-8 px-6 text-base text-gray-700">{item.answer}</div>
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
    <section className="py-20  text-gray-800 bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#80A9F9]/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#80A9F9]/30 rounded-full blur-3xl"></div>
      </div>
      <div className="mx-auto max-w-6xl px-5 relative z-10">
        <div className="flex flex-col items-center justify-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#80A9F9]/20 text-[#3B7DDD] text-sm font-medium mb-4">
            Got questions?
          </div>
          <h4 className="text-3xl font-bold mb-4 text-center md:text-4xl">
            Frequently Asked Questions
          </h4>
          <div className="w-20 h-1 bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] rounded-full mb-6"></div>
          <p className="text-gray-600 text-center max-w-2xl">
            Find answers to common questions about DiscoverMinds.ai, our features, and how we handle
            your data.
          </p>
        </div>
        <div className="space-y-6 max-w-4xl mx-auto">
          {faqData.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onClick={() => handleClick(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
