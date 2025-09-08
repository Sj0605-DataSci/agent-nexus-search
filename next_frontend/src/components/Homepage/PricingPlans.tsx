"use client";
import React, { useState } from "react";
import { FaHandshake } from "react-icons/fa6";
import { BsMegaphone } from "react-icons/bs";
import { GiSpiderWeb } from "react-icons/gi";
import { FiCheckCircle, FiSearch, FiArrowRight } from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { BsShieldCheck, BsBuilding } from "react-icons/bs";

interface PlanProps {
  name: string;
  price: string;
  priceDetail: string;
  buttonText: string;
  buttonStyle: string;
  bgColor: string;
  borderColor: string;
  isPopular: boolean;
  features: string[];
}

const PricingPlans = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const getProPlanPrice = (cycle: "monthly" | "yearly") => {
    return cycle === "monthly" ? "$30" : "$24";
  };

  const getProPlanDetail = (cycle: "monthly" | "yearly") => {
    return cycle === "monthly" ? "/user/month" : "/user/month";
  };
  const scrollToWaitlistInput = (e: React.MouseEvent) => {
    e.preventDefault();

    const emailInput = document.getElementById("waitlist-email");

    if (emailInput) {
      emailInput.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => {
        emailInput.focus();
      }, 800);
    }
  };

  const plans: PlanProps[] = [
    {
      name: "Hunter plan",
      price: "Free",
      priceDetail: "",
      buttonText: "Create account",
      buttonStyle: "bg-[#C1E1A6] hover:bg-[#B1D196] text-[#0E3D15]",
      bgColor: "bg-[#EFFBD7]",
      borderColor: "border-[#B2DC8A]",
      isPopular: false,
      features: [
        "Access to the DiscoverMinds search",
        "Unlimited connected accounts",
        "Unlimited Friends",
        "Unlimited Collaborator",
        "Export search results to CSV",
        "AI icebreaker suggestions and unlimited warm intros",
      ],
    },
    {
      name: "Pro plan",
      price: getProPlanPrice(billingCycle),
      priceDetail: getProPlanDetail(billingCycle),
      buttonText: "Create account",
      buttonStyle: "bg-white hover:bg-gray-50 text-[#0E3D15] border border-[#0E3D15]",
      bgColor: "bg-[#0E3D15]",
      borderColor: "border-gray-200",
      isPopular: true,
      features: [
        "Everything in Hunter Plan",
        "Unlimited searches and unlimited results",
        "Email-to-search: Forward any email to instantly find relevant contacts",
        "Advanced CSV export (custom fields, enrichment data)",
        "Slack and Discord integrations",
        "Early access to new features",
      ],
    },
    {
      name: "Enterprise plan",
      price: "Custom",
      priceDetail: "",
      buttonText: "Contact sales",
      buttonStyle: "bg-[#C1E1A6] hover:bg-[#B1D196] text-[#0E3D15]",
      bgColor: "bg-[#EFFBD7]",
      borderColor: "border-[#B2DC8A]",
      isPopular: false,
      features: [
        "All Pro features",
        "Multiple platform connectors (CRM, ATS, Salesforce, HubSpot, GitHub)",
        "Custom API access for integration and data export",
        "Advanced analytics dashboard",
        "Compliance & security: SOC 2, ISO 27001, GDPR/CCPA",
        "White-label portal and custom branding",
      ],
    },
  ];

  const toggleBillingCycle = (cycle: "monthly" | "yearly") => {
    setBillingCycle(cycle);
  };

  return (
    <div className="bg-white items-center justify-center py-24" id="pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 max-w-[662px] mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-[48px] font-[500] text-[#0E3D15] mb-2 md:mb-4">
            Simple & transparent pricing for all business sizes
          </h2>
        </div>
        <div className="flex justify-center mb-20">
          <div
            className="bg-[#EFFBD7] border border-[#0D1B2A10] border-opacity-10 rounded-[12px] p-[4px] py-2 inline-flex relative overflow-hidden"
            style={{ width: "min(314px, 100%)", height: "50px", maxWidth: "100%" }}
          >
            <div
              className="absolute top-[6px] bottom-[6px] w-[calc(50%-6px)] transition-all duration-300 ease-in-out shadow-md rounded-[8px] bg-white"
              style={{
                transform: billingCycle === "yearly" ? "translateX(0)" : "translateX(100%)",
                left: "6px",
                boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            />

            <button
              onClick={() => toggleBillingCycle("yearly")}
              className={`relative z-10 flex items-center justify-center w-1/2 py-2 rounded-[8px] text-[20px] font-[500]`}
              style={{
                fontFamily: "Inter, sans-serif",
                color: billingCycle === "yearly" ? "#111111" : "#0E3D15",
              }}
            >
              <span>Yearly</span>
              <span
                className={`ml-2 text-xs px-2 py-0.5 rounded-[8px] font-[500] transition-colors duration-300`}
                style={{
                  fontSize: "14px",
                  backgroundColor: billingCycle === "yearly" ? "#EFFBD7" : "#f3f3f3",
                  color: billingCycle === "yearly" ? "#0E3D15" : "#111111",
                }}
              >
                20% off
              </span>
            </button>

            <button
              onClick={() => toggleBillingCycle("monthly")}
              className={`relative z-10 flex items-center justify-center w-1/2 py-2 rounded-[8px] text-[20px] font-[500]`}
              style={{
                fontFamily: "Inter, sans-serif",
                color: billingCycle === "monthly" ? "#111111" : "#0E3D15",
              }}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2  gap-6 ">
          <div
            className={`bg-[#EFFBD7] rounded-[16px] border-[2px] group p-6 flex flex-col h-full border border-[#11111126] 
                     hover:shadow-md cursor-pointer`}
          >
            <div className="mb-6">
              <div className="flex items-center mb-1">
                <FiSearch className="w-5 h-5 mr-1.5 text-[#0E3D15]" />
                <h3
                  className={`text-md md:text-[22px] font-bold uppercase tracking-wider text-[#0E3D15] 
                               transition-all duration-300 origin-left`}
                >
                  Hunter plan
                </h3>
              </div>

              <div
                className={`flex items-baseline text-[48px] font-bold text-[#0E3D15] 
                              transition-all duration-300 origin-left`}
              >
                Free
              </div>
            </div>

            <div className="mt-4 mb-5">
              <button
                onClick={scrollToWaitlistInput}
                className={`w-full bg-[#C1E1A6] hover:bg-[#B1D196] text-[#0E3D15] font-medium py-3 px-4 rounded-[8px] group-hover:scale-105
                           transition-all duration-300 transform hover:bg-[#A1CC86] hover:shadow-md`}
              >
                <span className="flex text-[18px] font-medium items-center justify-center">
                  Join Waitlist
                  <FiArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 " />
                </span>
              </button>
            </div>

            <div
              className={`w-full border-t mb-4 border-[#B2DC8A] transition-all duration-300 group-hover:border-opacity-100`}
            ></div>

            <div className="space-y-2 flex-grow">
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Access to the DiscoverMinds search
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Unlimited connected accounts
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Unlimited Friends
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Unlimited Collaborator
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Export search results to CSV
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  AI icebreaker suggestions and unlimited warm intros
                </span>
              </div>
            </div>
          </div>

          <div
            className={`bg-[#0E3D15] rounded-[16px] border-[2px] group p-6 flex flex-col h-full border border-[#11111126] 
                     hover:shadow-md cursor-pointer`}
          >
            <div className="-mt-10 mb-3 flex justify-center">
              <div className="flex items-center bg-[#EFFBD7] text-[#0E3D15] text-xs font-semibold py-1.5 px-4 rounded-full shadow-md">
                <FaCrown className="mr-1.5 animate-pulse" /> Most popular
              </div>
            </div>
            <div className="mb-6">
              <div className="flex items-center mb-1">
                <BsShieldCheck className="w-5 h-5 mr-1.5 text-[#fff]" />
                <h3
                  className={`text-md md:text-[22px] font-bold uppercase tracking-wider text-white 
                               transition-all duration-300 origin-left`}
                >
                  Pro plan
                </h3>
              </div>

              <div
                className={`flex items-baseline text-[48px] font-bold text-white 
                              transition-all duration-300 origin-left`}
              >
                {getProPlanPrice(billingCycle)}
                <div className="flex ml-1">
                  <span className="text-lg font-medium text-gray-300">
                    {getProPlanDetail(billingCycle)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 mb-5">
              <button
                onClick={scrollToWaitlistInput}
                className={`w-full bg-white hover:bg-gray-50 text-[#0E3D15] border border-[#0E3D15] font-medium py-3 px-4 rounded-[8px] group-hover:scale-105
                           transition-all duration-300 transform hover:bg-white hover:text-[#0E3D15] hover:border hover:border-[#0E3D15]`}
              >
                <span className="flex text-[18px] font-medium items-center justify-center">
                  Join Waitlist
                  <FiArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 " />
                </span>
              </button>
            </div>

            <div
              className={`w-full border-t mb-4 border-gray-200 transition-all duration-300 group-hover:border-opacity-100`}
            ></div>

            <div className="space-y-2 flex-grow">
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-white transition-all duration-300 group-hover:scale-105" />
                <span className="text-white transition-all text-[16px] duration-300">
                  Everything in Hunter Plan
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-white transition-all duration-300 group-hover:scale-105" />
                <span className="text-white transition-all text-[16px] duration-300">
                  Unlimited searches and unlimited results
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-white transition-all duration-300 group-hover:scale-105" />
                <span className="text-white transition-all text-[16px] duration-300">
                  Email-to-search: Forward any email to instantly find relevant contacts
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-white transition-all duration-300 group-hover:scale-105" />
                <span className="text-white transition-all text-[16px] duration-300">
                  Advanced CSV export (custom fields, enrichment data)
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-white transition-all duration-300 group-hover:scale-105" />
                <span className="text-white transition-all text-[16px] duration-300">
                  Slack and Discord integrations
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-white transition-all duration-300 group-hover:scale-105" />
                <span className="text-white transition-all text-[16px] duration-300">
                  Early access to new features
                </span>
              </div>
            </div>
          </div>

          <div
            className={`bg-[#EFFBD7] rounded-[16px] border-[2px] group p-6 flex flex-col h-full border border-[#11111126] 
                     hover:shadow-md cursor-pointer`}
          >
            <div className="mb-6">
              <div className="flex items-center mb-1">
                <BsBuilding className="w-5 h-5 mr-1.5 text-[#0E3D15]" />
                <h3
                  className={`text-md md:text-[22px] font-bold uppercase tracking-wider text-[#0E3D15] 
                               transition-all duration-300 origin-left`}
                >
                  Enterprise plan
                </h3>
              </div>

              <div
                className={`flex items-baseline text-[48px] font-bold text-[#0E3D15] 
                              transition-all duration-300 origin-left`}
              >
                Custom
              </div>
            </div>

            <div className="mt-4 mb-5">
              <button
                onClick={scrollToWaitlistInput}
                className={`w-full bg-[#C1E1A6] hover:bg-[#B1D196] text-[#0E3D15] font-medium py-3 px-4 rounded-[8px] group-hover:scale-105
                           transition-all duration-300 transform hover:bg-[#A1CC86] hover:shadow-md`}
              >
                <span className="flex text-[18px] font-medium items-center justify-center">
                  Join Waitlist
                  <FiArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 " />
                </span>
              </button>
            </div>

            <div
              className={`w-full border-t mb-4 border-[#B2DC8A] transition-all duration-300 group-hover:border-opacity-100`}
            ></div>

            <div className="space-y-2 flex-grow">
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  All Pro features
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Multiple platform connectors (CRM, ATS, Salesforce, HubSpot, GitHub)
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Custom API access for integration and data export
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Advanced analytics dashboard
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  Compliance & security: SOC 2, ISO 27001, GDPR/CCPA
                </span>
              </div>
              <div className="flex items-center ">
                <FiCheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-[#0E3D15] transition-all duration-300 group-hover:scale-105" />
                <span className="text-[#0E3D15] transition-all text-[16px] duration-300">
                  White-label portal and custom branding
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
