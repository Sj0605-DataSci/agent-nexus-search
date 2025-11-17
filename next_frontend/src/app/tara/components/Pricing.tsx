import React from "react";
import Link from "next/link";

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-green-500"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const pricingPlans = [
  {
    name: "Starter",
    price: "₹99",
    description: "For individuals and small teams getting started with Tally automation.",
    features: ["1000 WhatsApp Queries/mo", "50 Invoice Scans/mo", "Email Support"],
    cta: "Start 7-Day Free Trial",
  },
  {
    name: "Pro",
    price: "₹249",
    description:
      "A comprehensive solution for growing businesses that need more power and automation.",
    features: [
      "Unlimited WhatsApp Queries",
      "500 Invoice Scans/mo",
      "Real-time Analytics",
      "Priority Support",
    ],
    cta: "Start 7-Day Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description:
      "For large organizations requiring advanced features, security, and dedicated support.",
    features: [
      "Unlimited Everything",
      "Dedicated Account Manager",
      "Enterprise Integrations",
      "On-premise Options",
    ],
    cta: "Contact Sales",
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">Pricing</h2>
          <p className="mt-4 text-gray-600">
            Simple, transparent pricing for businesses of all sizes.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative flex flex-col rounded-2xl border ${plan.popular ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-800"} p-8 shadow-lg`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold uppercase">
                  Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p
                className={`mt-4 text-4xl font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}
              >
                {plan.price}
                {plan.price !== "Custom" && <span className="text-sm font-medium"> / month</span>}
              </p>
              <p className={`mt-4 text-sm ${plan.popular ? "text-gray-300" : "text-gray-600"}`}>
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Link
                  href="/contact"
                  className={`block rounded-lg px-6 py-3 text-center text-sm font-medium ${plan.popular ? "bg-white text-gray-900 hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-800"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
