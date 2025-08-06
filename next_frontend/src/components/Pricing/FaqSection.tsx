"use client";

import React, { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";

interface FaqItemData {
  question: string;
  answer: JSX.Element;
}

const faqData: FaqItemData[] = [
  {
    question: "What is a search credit and how are they consumed?",
    answer: (
      <>
        <p>
          Search credits are the currency used to perform searches on our platform. Different search
          types consume different amounts of credits:
        </p>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>Basic search: 1 credit - Standard search with our General Agent</li>
          <li>Deep search: 3 credits - More comprehensive results with specialized agents</li>
          <li>
            Advanced search: 7 credits - Our most powerful search with all agents and extensive data
            analysis (Enterprise plan only)
          </li>
        </ul>
        <p className="mt-4">
          Credits are automatically deducted when you perform a search, and your remaining balance
          is displayed in your account dashboard.
        </p>
      </>
    ),
  },
  {
    question: "What happens when I run out of credits?",
    answer: (
      <>
        <p>
          When you run out of credits, you'll still have access to your account and past search
          results, but you won't be able to perform new searches until you:
        </p>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            Wait for your monthly credit allowance to reset at the start of your next billing cycle
          </li>
          <li>Purchase additional credits as an add-on to your current plan</li>
          <li>Upgrade to a higher tier plan with more monthly credits</li>
        </ul>
        <p className="mt-4">
          Professional and Enterprise plans have the option to enable automatic credit refills to
          ensure uninterrupted service.
        </p>
      </>
    ),
  },
  {
    question: "What's the difference between search types?",
    answer: (
      <>
        <p>DiscoverMinds offers three search types with increasing depth and capabilities:</p>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            <strong>Basic search (1 credit):</strong> Quick searches with the General Agent,
            suitable for most everyday queries.
          </li>
          <li>
            <strong>Deep search (3 credits):</strong> More comprehensive analysis with specialized
            agents (HR, Sales), better context understanding, and more detailed profiles.
          </li>
          <li>
            <strong>Advanced search (7 credits):</strong> Our most powerful search option with all
            agents, extensive data analysis, highest quality results, and specialized filtering
            options (Enterprise plan only).
          </li>
        </ul>
      </>
    ),
  },
  {
    question: "Can I share credits with my team?",
    answer: (
      <>
        <p>Yes, credit sharing depends on your plan:</p>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            <strong>Hunter (Free):</strong> Credits are individual and cannot be shared.
          </li>
          <li>
            <strong>Professional:</strong> Credits are assigned per user but can be pooled within
            small teams (up to 5 users).
          </li>
          <li>
            <strong>Enterprise:</strong> Credits are pooled across your entire organization with
            admin controls to allocate and monitor usage.
          </li>
        </ul>
        <p className="mt-4">
          Enterprise plans include advanced team management features, usage analytics, and the
          ability to set credit limits for different departments or user groups.
        </p>
      </>
    ),
  },
  {
    question: "How do Automatic Credit Refills work?",
    answer: (
      <>
        <p>Automatic Credit Refills ensure you never run out of search credits:</p>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>Set a credit threshold (e.g., 50 credits remaining)</li>
          <li>Choose a refill amount (e.g., 250 credits)</li>
          <li>When your balance drops below the threshold, credits are automatically added</li>
          <li>Your payment method on file is charged at the discounted bulk rate</li>
        </ul>
        <p className="mt-4">
          You can enable, disable, or adjust refill settings at any time from your account
          dashboard.
        </p>
      </>
    ),
  },
  {
    question: "What are the new features in the latest update?",
    answer: (
      <>
        <p>We've added several new features to enhance your search experience:</p>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            <strong>Search within LinkedIn connections:</strong> Find prospects and leads from your
            own network (Hunter plan and above).
          </li>
          <li>
            <strong>Customize agent personality:</strong> Tailor the agent's tone and style to match
            your brand (Hunter plan and above).
          </li>
          <li>
            <strong>CSV Export:</strong> Export your search results to CSV format. The number of
            results you can export at once depends on your plan:
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Hunter: Up to 5 results at a time</li>
              <li>Professional: Up to 50 results at a time</li>
              <li>Enterprise: Unlimited results</li>
            </ul>
          </li>
          <li>
            <strong>Email Integration:</strong> Get responses and send queries via email.
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Hunter: Get responses on email</li>
              <li>Professional: Send queries and get responses on email</li>
              <li>Enterprise: Full email integration</li>
            </ul>
          </li>
          <li>
            <strong>Slack Integration:</strong> Integrate with your Slack workspace (Professional
            plan and above).
          </li>
        </ul>
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
    <section className="py-20 md:py-40 text-gray-800 bg-gray-50 relative overflow-hidden">
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
            Everything you need to know about our credit-based search system and plans
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
