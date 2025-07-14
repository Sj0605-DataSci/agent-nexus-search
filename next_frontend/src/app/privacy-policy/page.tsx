"use client";

import { Suspense } from "react";
import Link from "next/link";
import privacyPolicy from "@/constant/privacy-policy.json";

const PrivacyPolicyContent = () => {
  return (
    <div
      className={`min-h-screen flex items-center bg-white/90 justify-center transition-colors duration-500  bg-gradient-to-br from-white/90 to-white/80 `}
    >
      <div
        className={`relative w-full max-w-3xl mx-2 p-8 sm:p-10 mt-10 transition-colors duration-500 bg-white/90 border-white/20 `}
      >
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className={`text-3xl font-bold text-gray-900`}>DiscoverMinds.ai</span>
          </Link>
          <h1 className={`text-2xl font-bold mb-2 text-gray-900`}>{privacyPolicy.title}</h1>
          <p className={"text-gray-600"}>{privacyPolicy.introduction}</p>
          <p className="text-xs mt-2">{`Last updated: ${privacyPolicy.lastUpdated}`}</p>
        </div>
        <div className="space-y-8">
          {privacyPolicy.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className={`text-xl font-semibold mb-2 text-gray-900`}>{section.title}</h2>
              <ul className="list-disc ml-6 space-y-1">
                {section.content.map((point, jdx) => (
                  <li key={jdx} className={"text-gray-800"}>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t pt-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact</h2>
          <ul className="ml-2 space-y-1">
            <li className="text-gray-800">
              <strong>Email:</strong>{" "}
              <a
                href={`mailto:${privacyPolicy.contact.sendto}`}
                className="underline text-blue-600"
              >
                {privacyPolicy.contact.sendto}
              </a>
            </li>
            <li className="text-gray-800">
              <strong>Address:</strong> {privacyPolicy.contact.address}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const PrivacyPolicyPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <PrivacyPolicyContent />
    </Suspense>
  );
};

export default PrivacyPolicyPage;
