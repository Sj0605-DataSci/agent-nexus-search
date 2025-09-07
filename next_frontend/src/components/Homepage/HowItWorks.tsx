import React from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck } from "react-icons/fi";

interface StepProps {
  title: string;
  description: string[];
  stepNumber: number;
  isLast?: boolean;
}

const Step: React.FC<StepProps> = ({ title, description, stepNumber, isLast = false }) => (
  <article
    className="flex gap-4 group hover:bg-[#FAFFF2] p-3 -m-3 rounded-lg transition-all duration-300 cursor-default"
    aria-labelledby={`step-${stepNumber}-title`}
  >
    <div className="relative flex-shrink-0">
      <div
        className="w-[45px] h-[45px] flex items-center justify-center text-[22px] font-medium text-[#0E3D15] 
                 bg-white border-2 border-[#EFFBD7] rounded-lg shadow-sm group-hover:border-[#B2DC8A] 
                 group-hover:shadow-md transition-all duration-300 transform group-hover:scale-105"
        aria-hidden="true"
      >
        {stepNumber}
      </div>
      {!isLast && (
        <div
          className="absolute top-[45px] bottom-[-45px] left-1/2 w-[2px] bg-[#EFFBD7] group-hover:bg-[#B2DC8A] transform -translate-x-1/2 transition-colors duration-300"
          aria-hidden="true"
        />
      )}
    </div>
    <div className="pb-5 relative">
      <h3
        id={`step-${stepNumber}-title`}
        className="text-lg font-semibold mb-2 text-[#0E3D15] md:text-xl relative inline-block"
      >
        {title}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#B2DC8A] group-hover:w-full transition-all duration-300 ease-out"></span>
      </h3>
      <ul className="list-none pl-0 space-y-2">
        {description.map((item, i) => (
          <li
            key={i}
            className="flex items-start text-[15px] text-[#0E3D15] leading-snug md:text-[15px] lg:text-[16px] group-hover:translate-x-1 transition-transform duration-300 delay-75"
          >
            <FiCheck className="flex-shrink-0 mt-1 mr-2 text-[#B2DC8A] group-hover:text-[#0E3D15] transition-colors duration-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  </article>
);

const HowItWorks = () => {
  const steps = [
    {
      title: "Natural Language Search",
      description: [
        'Just type what you need in plain language: "Find people in my network with AI expertise" or "Show contacts at Series B startups in Mumbai."',
        "No complex filters or menus - search naturally and get instant results.",
      ],
    },
    {
      title: "Smart AI Agents",
      description: [
        "Our agents understand your intent and dig deep across all your trusted networks.",
        "They learn from your feedback to refine future searches.",
      ],
    },
    {
      title: "Personalized Memory",
      description: [
        "Agents remember your preferences, past searches, and saved contacts.",
        "The more you use DiscoverMinds, the faster and more relevant your results become.",
      ],
    },
    {
      title: "Verified, High-Quality Contacts",
      description: [
        "We enrich profiles with up-to-date emails, job history, and social links.",
        "Results are ranked by relevance to your needs, not generic popularity.",
      ],
    },
  ];

  return (
    <section className="bg-white bg-red-400 py-10 md:py-16">
      <div className="mx-auto  max-w-6xl px-4 lg:px-0 ">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <header className="md:w-1/3 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              How it works
            </h2>
            <p className="text-base text-gray-700 leading-relaxed">
              DiscoverMinds is designed to fit into your existing workflow of talent scouting.
            </p>
            <Link
              href="https://calendly.com/founders-discoverminds/30min"
              className="inline-flex items-center justify-center bg-[#B2DC8A] hover:bg-[#9BCB7A] text-[#0E3D15] font-semibold text-base py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E3D15]"
              aria-label="Schedule a demo to see how it works"
            >
              Schedule a Demo
              <FiArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </header>

          <div className="md:w-2/3">
            <div className="space-y-5 md:space-y-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="transform transition-all duration-300 hover:-translate-y-1"
                >
                  <Step
                    title={step.title}
                    description={step.description}
                    stepNumber={index + 1}
                    isLast={index === steps.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
