"use client";

import React, { useState } from "react";
import Link from "next/link";
import HomeHeader from "@/components/Homepage/Header";
import Footer from "@/components/Homepage/Footer";
import FaqSection from "@/components/Pricing/FaqSection";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  return (
    <>
      <HomeHeader />
      <div>
        <div className="relative bg-gradient-to-r from-gray-50 to-[#EEF3FB] text-gray-800">
          <div className="pt-28 pb-16 md:pt-36 md:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold md:text-6xl mb-4">⚔️ Unleash Arya's Power</h1>
              <div className="w-16 h-1 bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] mx-auto mb-6"></div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                Choose the perfect plan for your hunting needs
              </p>

              <div className="max-w-2xl mx-auto mb-6 text-gray-600">
                <p className="mb-3">
                  Our credit-based system gives you flexibility to use our powerful search features
                  based on your needs.
                </p>
                <p>Credits are consumed differently based on search type and agent.</p>
              </div>

              {/* Pricing Toggle */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center bg-gray-100 rounded-full p-1">
                  <button
                    onClick={() => setIsYearly(false)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      !isYearly
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsYearly(true)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 relative ${
                      isYearly
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white flex w-full py-24">
          <div className="grid w-full grid-cols-1 gap-8 px-4 md:mx-auto md:max-w-2xl md:grid-cols-2 xl:max-w-6xl xl:grid-cols-3">
            <div className="flex h-full min-h-[440px] w-full flex-col gap-10 rounded-xl px-6 py-8 bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full opacity-30"></div>
              <div className="flex w-full flex-col gap-10">
                <div className="flex flex-col">
                  <div className="flex h-20 flex-col">
                    <div className="flex gap-2">
                      <p className="text-xl font-medium uppercase text-gray-800">Hunter</p>
                      <p className="w-fit rounded-sm bg-gray-100 px-1 py-1 font-mono text-sm font-medium uppercase text-gray-700">
                        Free
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <p className="text-4xl font-medium text-gray-800">$0</p>
                    <p className="text-sm text-gray-500">forever</p>
                  </div>
                </div>
                <Link href="/signup">
                  <button className="cursor-pointer whitespace-nowrap font-medium leading-6 transition-colors inline-flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 disabled:pointer-events-none text-gray-700 hover:text-gray-900 disabled:opacity-30 focus-visible:ring-offset-gray-100 focus-visible:ring-gray-400 w-full md:min-w-[15rem] md:w-fit px-6 py-3 text-base md:text-base shadow-[inset_0_0_0_1px_currentColor] rounded-lg">
                    Sign Up
                  </button>
                </Link>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <ul className="flex flex-col gap-4 text-gray-700">
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      5 search credits/day
                      <p className="mt-1 text-xs leading-4 text-gray-500">
                        Basic search: 1 credit
                        <br />
                        Deep search: 3 credits
                      </p>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      <span className="group relative inline underline decoration-dotted ">
                        General Agent only
                      </span>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Basic search features
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Community support
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      7-day search history
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Search Within Linkedin connections
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Customize the agent personality
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Result in Chat and CSV format(Upto 5 at a time)
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Get response on email
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex h-full min-h-[440px] w-full flex-col gap-10 rounded-xl px-6 py-8 bg-[#EEF3FB] shadow-sm hover:shadow-md border border-[#D0E0F7] relative overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#80A9F9]/20 rounded-bl-full opacity-30"></div>
              <div className="flex w-full flex-col gap-10">
                <div className="flex flex-col">
                  <div className="flex h-20 flex-col">
                    <div className="flex gap-2">
                      <p className="text-xl font-medium uppercase text-gray-800">Professional</p>
                      <p className="w-fit rounded-sm bg-[#80A9F9]/30 px-1 py-1 font-mono text-sm font-medium uppercase text-[#3B7DDD]">
                        Most Popular
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <p className="text-4xl font-medium text-gray-800">${isYearly ? "15" : "25"}</p>
                    <p className="text-sm text-gray-500">
                      per user / month{isYearly ? " (billed yearly)" : ""}
                    </p>
                  </div>
                  {isYearly && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 line-through">$25/month</p>
                      <p className="text-sm text-green-600 font-medium">
                        Save $120/year with yearly billing
                      </p>
                    </div>
                  )}
                </div>
                <Link href="/signup?plan=professional">
                  <button className="cursor-pointer whitespace-nowrap font-medium leading-6 transition-colors inline-flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 disabled:pointer-events-none bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] text-white hover:opacity-90 focus-visible:ring-offset-[#4A89DC] focus-visible:ring-[#80A9F9] disabled:opacity-30 w-full md:min-w-[15rem] md:w-fit px-6 py-3 text-base md:text-base rounded-lg">
                    Select plan
                  </button>
                </Link>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <ul className="flex flex-col gap-4 text-gray-700">
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      <span className="font-medium">Everything in Hunter, plus:</span>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      400 search credits/month
                      <p className="mt-1 text-xs leading-4 text-gray-500">
                        Basic search: 1 credit
                        <br />
                        Deep search: 3 credits
                      </p>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      <span className="group relative inline underline decoration-dotted ">
                        All agents(General Agent, HR Agent, Sales Agent)
                      </span>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Advanced search features
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Priority support
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      30-day search history
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Result in Chat and CSV format(Upto 50 at a time)
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Slack Bot Integrations
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Export History quickly
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Send search query on Mail and get response
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex h-full min-h-[440px] w-full flex-col gap-10 rounded-xl px-6 py-8 bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full opacity-30"></div>
              <div className="flex w-full flex-col gap-10">
                <div className="flex flex-col">
                  <div className="flex h-20 flex-col">
                    <div className="flex gap-2">
                      <p className="text-xl font-medium uppercase text-gray-800">
                        Enterprise & Community{" "}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <p className="text-4xl font-medium text-gray-800">Custom</p>
                    <p className="text-sm text-gray-500">pricing</p>
                  </div>
                </div>
                <Link href="/signup">
                  <button className="cursor-pointer whitespace-nowrap font-medium leading-6 transition-colors inline-flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 disabled:pointer-events-none text-gray-700 hover:text-gray-900 disabled:opacity-30 focus-visible:ring-offset-gray-100 focus-visible:ring-gray-400 w-full md:min-w-[15rem] md:w-fit px-6 py-3 text-base md:text-base shadow-[inset_0_0_0_1px_currentColor] rounded-lg">
                    Select plan
                  </button>
                </Link>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <ul className="flex flex-col gap-4 text-gray-700">
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      <span className="font-medium">Everything in Professional, plus:</span>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      2,000 search credits/user/month
                      <p className="mt-1 text-xs leading-4 text-gray-500">
                        Basic search: 1 credit
                        <br />
                        Deep search: 3 credits
                      </p>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      <span className="group relative inline underline decoration-dotted ">
                        Add-on credits at $40/1000 credits
                      </span>
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Team collaboration features
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Arya Integrations: Slack, WhatsApp Business, Microsoft Teams, Discord
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Dashboard & Analytics
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Role-Based Access Control (RBAC)
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      SSO + Access control features
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Dedicated account management
                    </li>
                    <li className="relative pl-7 text-sm before:absolute before:left-0 before:text-[#4A89DC] before:content-['✓'] md:text-base">
                      Unlimited search history
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex flex-col items-center justify-center mb-16">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#80A9F9]/20 text-[#3B7DDD] text-sm font-medium mb-4">
                Compare Plans
              </div>
              <h4 className="text-3xl font-bold mb-4 text-center md:text-4xl">
                Find Your Perfect Fit
              </h4>
              <p className="text-gray-600 text-center max-w-2xl">
                Compare our plans side by side to find the one that best suits your needs
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="p-4 text-left">Features</th>
                    <th className="p-4 text-center">
                      Hunter <span className="text-gray-600 text-sm block">Free</span>
                    </th>
                    <th className="p-4 text-center bg-[#EEF3FB] rounded-t-lg">
                      Professional <span className="text-[#4A89DC] text-sm block">$15/month</span>
                    </th>
                    <th className="p-4 text-center">
                      Enterprise & Community{" "}
                      <span className="text-gray-700 text-sm block">Custom</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Search Credits</td>
                    <td className="p-4 text-center">5/day</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">400/month</td>
                    <td className="p-4 text-center">2,000/month</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Available Agents</td>
                    <td className="p-4 text-center">General only</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">All agents</td>
                    <td className="p-4 text-center">All agents</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Search History</td>
                    <td className="p-4 text-center">7 days</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">30 days</td>
                    <td className="p-4 text-center">90 days</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Support</td>
                    <td className="p-4 text-center">Community</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">Priority</td>
                    <td className="p-4 text-center">Dedicated</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Add-on Credits</td>
                    <td className="p-4 text-center">Not available</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">$10/250 credits</td>
                    <td className="p-4 text-center">$40/1000 credits</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Team Features</td>
                    <td className="p-4 text-center">No</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">Basic sharing</td>
                    <td className="p-4 text-center">Full collaboration</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Analytics</td>
                    <td className="p-4 text-center">Basic</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">Advanced</td>
                    <td className="p-4 text-center">Enterprise-grade</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">LinkedIn Integration</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                    <td className="p-4 text-center bg-[#EEF3FB] text-green-500">✓</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Custom Agent Personality</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                    <td className="p-4 text-center bg-[#EEF3FB] text-green-500">✓</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">CSV Export</td>
                    <td className="p-4 text-center">Up to 5</td>
                    <td className="p-4 text-center bg-[#EEF3FB]">Up to 50</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Get Response on Email</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                    <td className="p-4 text-center bg-[#EEF3FB] text-green-500">✓</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Slack Integration</td>
                    <td className="p-4 text-center text-red-500">-</td>
                    <td className="p-4 text-center bg-[#EEF3FB] text-green-500">✓</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-4 font-medium">Query via Email</td>
                    <td className="p-4 text-center text-red-500">-</td>
                    <td className="p-4 text-center bg-[#EEF3FB] text-green-500">✓</td>
                    <td className="p-4 text-center text-green-500">✓</td>
                  </tr>
                  <tr>
                    <td className="p-4"></td>
                    <td className="p-4 text-center">
                      <Link href="/signup">
                        <button className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors duration-200 text-sm font-medium">
                          Sign Up
                        </button>
                      </Link>
                    </td>
                    <td className="p-4 text-center bg-[#EEF3FB] rounded-b-lg">
                      <Link href="/signup?plan=professional">
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] text-white hover:opacity-90 transition-colors duration-200 text-sm font-medium">
                          Select Plan
                        </button>
                      </Link>
                    </td>
                    <td className="p-4 text-center">
                      <Link href="/signup?plan=enterprise">
                        <button className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors duration-200 text-sm font-medium">
                          Select Plan
                        </button>
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <FaqSection />
      </div>
      <Footer />
    </>
  );
}
