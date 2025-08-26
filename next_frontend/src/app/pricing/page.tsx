"use client";

import React, { useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/Homepage/Header";
import Footer from "@/components/Homepage/Footer";
import FaqSection from "@/components/Pricing/FaqSection";
import AnimatedCounter from "@/components/Pricing/AnimatedCounter";
import { motion } from "framer-motion";

const PlanFeature = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center space-x-3">
    <svg
      className="h-5 w-5 flex-shrink-0 text-green-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
    <span className="text-gray-700">{children}</span>
  </div>
);

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("yearly");

  const proMonthlyPrice = 15;
  const proYearlyPrice = 144;

  return (
    <>
      <HomeHeader />
      <div className="bg-gray-50 md:pt-16">
        <div className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Smart Plans for Smarter Connections
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Use DiscoverMinds for free with your whole team. Upgrade for unlimited searches, our
              email agent, and additional features.
            </p>
          </div>

          <div className="flex items-center pt-4 w-full justify-center mb-8">
            <div className="relative flex items-center rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`relative rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 ${
                  billingCycle === "monthly" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {billingCycle === "monthly" && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Monthly</span>
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`relative rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 ${
                  billingCycle === "yearly" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {billingCycle === "yearly" && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Yearly</span>
              </button>
            </div>
            <span
              className={`ml-4 text-sm font-semibold text-green-600 transition-opacity duration-300 -mr-18`}
            >
              Save 20%
            </span>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Hunter Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
              <h2 className="text-2xl font-semibold text-gray-900">Free</h2>
              <p className="mt-2 text-4xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-gray-500">Free forever</p>

              <p className="mt-6 font-semibold text-gray-800">Perfect for most users</p>
              <div className="mt-4 space-y-3">
                <PlanFeature>Access to DiscoverMinds search</PlanFeature>
                <PlanFeature>Unlimited connected accounts</PlanFeature>
                <PlanFeature>Unlimited friends</PlanFeature>
                <PlanFeature>Unlimited groups</PlanFeature>
                <PlanFeature>Slack and Discord integrations</PlanFeature>
              </div>
              <div className="mt-auto pt-8">
                <Link
                  href="/signup"
                  className="block w-full bg-green-500/40 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-600/40 transition"
                >
                  Current plan
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl border-2 border-blue-500/50 shadow-lg p-8 flex flex-col relative">
              <h2 className="text-2xl font-semibold text-gray-900">Pro</h2>
              <p className="mt-2 text-4xl font-bold text-blue-600">
                $
                <AnimatedCounter
                  value={
                    billingCycle === "monthly" ? proMonthlyPrice : Math.round(proYearlyPrice / 12)
                  }
                />
              </p>
              <p className="text-sm text-gray-500">Per month, billed {billingCycle}</p>

              <p className="mt-6 font-semibold text-gray-800">Purpose-built for power users</p>
              <div className="mt-4 space-y-3">
                <PlanFeature>Everything in Free</PlanFeature>
                <PlanFeature>Unlimited searches per month</PlanFeature>
                <PlanFeature>Unlimited results per search</PlanFeature>
                <PlanFeature>Forward emails to agent@discoverminds.ai</PlanFeature>
                <PlanFeature>Export search results to CSV</PlanFeature>
                <PlanFeature>Early access to new features</PlanFeature>
              </div>
              <div className="mt-auto pt-8">
                <Link
                  href="/signup?plan=pro"
                  className="block w-full bg-gray-100 text-gray-800 text-center py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </div>

        <FaqSection />
      </div>
      <Footer />
    </>
  );
}
