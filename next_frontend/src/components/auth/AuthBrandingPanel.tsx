import React, { useMemo } from "react";
import Image from "next/image";

const companyLogos = [
  { name: "Adobe", width: 80, height: 40 },
  { name: "Google", width: 100, height: 40 },
  { name: "Juspay", width: 100, height: 40 },
  { name: "Meta", width: 80, height: 40 },
  { name: "Salesforce", width: 60, height: 24 },
] as const;

const AuthBrandingPanel = () => {
  const logoImages = useMemo(
    () =>
      companyLogos.map((company, index) => (
        <div key={`${company.name}-${index}`} className="h-10 relative flex-shrink-0 mx-3">
          <Image
            src={`/logos/TrustedPartners/${company.name}.webp`}
            alt={`${company.name} logo`}
            className="object-contain"
            width={company.width}
            height={company.height}
            priority={true}
            sizes="(max-width: 768px) 80px, 120px"
          />
        </div>
      )),
    []
  );

  return (
    <div className="hidden md:flex flex-col mx-6 my-6 justify-between bg-[#b2dc8b] p-8 md:p-12 rounded-xl">
      <div className="flex flex-col items-center text-center space-y-3 mt-4">
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 leading-tight max-w-md">
          Your Network is More Powerful Than You Think
        </h1>
        <p className="text-gray-700 text-sm">
          Discover connections and opportunities hiding in plain sight
        </p>
      </div>

      <div className="flex justify-center items-center my-6">
        <div className="relative w-full max-w-lg">
          <div className="relative bg-white pl-1 rounded-md shadow-2xl">
            <Image
              src="/hero/SearchResult.webp"
              alt="Dashboard Preview"
              width={500}
              height={400}
              className="rounded-2xl"
              priority
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden items-center justify-center flex flex-row mb-2">
        {logoImages}
      </div>
    </div>
  );
};

export default AuthBrandingPanel;
