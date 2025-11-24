import React from "react";

// Placeholder icons - replace with actual icons from a library like Lucide or Heroicons
const DataEntryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-8 h-8 text-blue-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3.003-3-3m0 0l-3 3m3-3v11.25"
    />
  </svg>
);

const InsightsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-8 h-8 text-blue-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3m-15 0h15M12 16.5h.008v.008H12v-.008z"
    />
  </svg>
);

const SecurityIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-8 h-8 text-blue-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
    />
  </svg>
);

const features = [
  {
    name: "Automated Data Entry",
    description:
      "Eliminate manual work by capturing invoices and expenses through WhatsApp, voice, or document uploads directly into Tally.",
    icon: DataEntryIcon,
  },
  {
    name: "Actionable Intelligence",
    description:
      "Run your operations with real-time cash flow insights, P&L statements, and predictive alerts, all derived from your Tally data.",
    icon: InsightsIcon,
  },
  {
    name: "Unmatched Security & Compliance",
    description:
      "Securely manage your finances with enterprise-grade controls, role-based access, audit trails, and automated GST/TDS compliance.",
    icon: SecurityIcon,
  },
];

const FeaturePillars = () => {
  return (
    <section id="features" className="bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg lg:p-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                TARA'S PILLARS
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl text-gray-900">
                An Accounting Experience That Scales With Your Business.
              </h2>
            </div>
            <div className="flex items-center">
              <p className="text-gray-600">
                Tara provides a complete financial operating system for Tally, streamlining your
                cash flow and automating compliance so you can focus on growth.
              </p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {features.map((feature, index) => (
              <div key={index}>
                <feature.icon />
                <h3 className="mt-4 text-lg font-bold text-gray-900">{feature.name}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturePillars;
