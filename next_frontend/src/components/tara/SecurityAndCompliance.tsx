import React from "react";

const securityFeatures = [
  "SSO & RBAC",
  "Data Residency Options",
  "End-to-End Encryption",
  "Immutable Audit Logs",
  "SOC 2 Type II Roadmap",
  "GST-Ready Compliance",
];

const SecurityAndCompliance = () => {
  return (
    <section className="bg-gray-100">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Enterprise-Grade Security & Compliance</h2>
          <p className="mt-4 text-gray-600">
            Your data is your most critical asset. We protect it with industry-leading security and
            compliance standards.
          </p>
        </div>

        <div className="mt-8">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 text-center"
              >
                <dt className="order-last text-lg font-medium text-gray-500">{feature}</dt>
                {/* Optional: Add an icon here */}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default SecurityAndCompliance;
