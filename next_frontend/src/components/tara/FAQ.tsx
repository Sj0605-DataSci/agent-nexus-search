"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How does Tara connect with my TallyPrime software?",
    answer:
      "Tara uses a secure desktop connector (Electron agent) that creates a secure tunnel to your TallyPrime installation. This enables real-time data access without manual exports, supporting multi-company setups while maintaining data security and integrity.",
  },
  {
    question: "Can I use Tara through WhatsApp for business operations?",
    answer:
      "Yes, Tara offers a WhatsApp-first experience for 24/7 conversational access. You can check inventory, get pricing information, place orders, and receive support through WhatsApp, making it convenient to manage your business on the go.",
  },
  {
    question: "Does Tara support automated document processing?",
    answer:
      "Absolutely! Tara features touchless document automation that converts photos, PDFs, and voice invoices into validated Tally entries within minutes. Our OCR technology with human-in-the-loop verification ensures 95%+ accuracy for all document processing.",
  },
  {
    question: "What kind of compliance features does Tara offer?",
    answer:
      "Tara includes a comprehensive compliance cockpit with GST/TDS automation, reconciliation engine, proactive alerts, and statutory deadline calendar. It helps with GST return preparation, automated filing, and ensures your business stays compliant with Indian tax regulations.",
  },
  {
    question: "How does Tara help with business insights and analytics?",
    answer:
      "Tara provides predictive insights including cashflow forecasts, anomaly detection, and credit control predictions. You get daily business summaries, sales performance reports, product/customer profitability insights, and automated alerts for important business metrics.",
  },
  {
    question: "Is Tara suitable for multi-location businesses?",
    answer:
      "Yes, Tara is built for scalability with multi-company tenancy, role-based access control (RBAC), and support for multi-location stock transfers. It's designed for enterprises with multiple Tally installations and complex organizational structures.",
  },
  {
    question: "What automation features are available in Tara?",
    answer:
      "Tara offers extensive automation including automated inventory and ledger updates, payment reminders via WhatsApp, expense tracking from receipts, automatic bank reconciliation, and vendor payment tracking. It also supports workflow automation with approval chains and notifications.",
  },
  {
    question: "How secure is my data with Tara?",
    answer:
      "Tara is enterprise-ready with robust security features including SSO integration, audit logs, secure tunnels for data transmission, and SOC2 compliance roadmap. We offer regional data residency options and support air-gapped Tally installations for maximum security.",
  },
  {
    question: "Can Tara integrate with other business software?",
    answer:
      "Yes, Tara features an integration marketplace with API connectivity for banking systems, ERPs, CRM platforms, and data warehouse exports. We support Zapier-like connectors and offer open APIs for custom integrations to fit your existing business ecosystem.",
  },
  {
    question: "What makes Tara different from other TallyPrime AI assistants?",
    answer:
      "Tara stands out with its human-in-the-loop validation for higher accuracy, comprehensive workflow engine, enterprise-grade security, predictive analytics, and true 24/7 WhatsApp accessibility. We focus on reliability, compliance, and scalability for serious business operations.",
  },
];

const FAQItem: React.FC<{
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}> = ({ item, isOpen, onToggle, index }) => {
  return (
    <div
      className={`group relative border border-gray-200/60 rounded-2xl mb-3 overflow-hidden transition-all duration-400 transform ${
        isOpen
          ? "shadow-lg shadow-blue-500/10 bg-gradient-to-br from-blue-50/10 to-indigo-50/10 border-blue-200/40 scale-[1.01]"
          : "shadow-sm bg-white hover:shadow-lg hover:shadow-gray-500/10 hover:border-gray-300/60 hover:-translate-y-0.5"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Subtle gradient overlay for open state */}
      {isOpen && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/5 to-indigo-50/5 pointer-events-none" />
      )}

      <button
        className="relative w-full p-6 text-left flex justify-between items-start transition-all duration-200"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex-1 pr-4">
          <h3
            className={`text-lg font-semibold transition-all duration-300 ${
              isOpen ? "text-blue-900" : "text-gray-900 group-hover:text-blue-800"
            }`}
          >
            {item.question}
          </h3>
        </div>

        <div
          className={`flex-shrink-0 ml-4 relative transition-all duration-300 ${
            isOpen ? "transform rotate-180" : "group-hover:scale-110"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isOpen
                ? "bg-blue-600 shadow-lg shadow-blue-600/25"
                : "bg-gray-100 group-hover:bg-blue-100 group-hover:shadow-md"
            }`}
          >
            {isOpen ? (
              <Minus className="w-4 h-4 text-white" />
            ) : (
              <Plus
                className={`w-4 h-4 transition-colors duration-200 ${"text-gray-600 group-hover:text-blue-600"}`}
              />
            )}
          </div>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-400 ease-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-6 pt-0">
          <div
            className={`border-t transition-all duration-300 pt-5 ${
              isOpen ? "border-blue-200/40" : "border-gray-200/50"
            }`}
          >
            <p className="text-gray-700 leading-relaxed text-base font-normal">{item.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // First item open by default

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section
      id="faq"
      className="py-24 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-semibold mb-6 shadow-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Most Asked Questions
          </div>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about Tara, your AI copilot for TallyPrime
          </p>
        </div>

        <div className="space-y-0 mb-20">
          {faqData.map((item, index) => (
            <FAQItem
              key={index}
              item={item}
              index={index}
              isOpen={openItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>

        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-white/50 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/20 to-blue-200/20 rounded-full translate-y-12 -translate-x-12" />

            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Still have questions?</h3>
              <p className="text-gray-600 mb-8 text-lg">
                Our team is here to help you get started with Tara
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <button className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
                    <span className="flex items-center justify-center">
                      Contact Support
                      <svg
                        className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </span>
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-semibold hover:-translate-y-0.5 hover:shadow-lg">
                    Book a Demo
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
