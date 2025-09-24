import React from "react";
import { FaHandshake } from "react-icons/fa6";
import { BsMegaphone } from "react-icons/bs";
import { GiSpiderWeb } from "react-icons/gi";
import { FiSearch } from "react-icons/fi";
import UseCasesSection from "./UseCasesSection";
import VideoPlayer from "./VideoPlayer";

const offeringsData = [
  {
    icon: <FaHandshake className="h-10 w-10 text-[#0E3D15]" />,
    title: "Connect all your socials",
    description:
      "Connect your socials like Linkedin, Twitter to make your people graph better and smarter.",
    bgColor: "bg-[#EFFBD7]",
  },
  {
    icon: <FiSearch className="h-10 w-10 text-[#0E3D15]" />,
    title: "Find Anyone Instantly",
    description:
      "Describe exactly who you need (“fintech PM in BLR,” “AI researcher at IITD”) and get relevant matches across every connected network.",
    bgColor: "bg-[#EFFBD7]",
  },
  {
    icon: <BsMegaphone className="h-10 w-10 text-[#0E3D15]" />,
    title: "Personalized Outreach at Scale",
    description: "Craft AI-generated icebreakers tailored to each contact’s profile.",
    bgColor: "bg-[#EFFBD7]",
  },
  {
    icon: <GiSpiderWeb className="h-10 w-10 text-[#0E3D15]" />,
    title: "Invite Your Network",
    description:
      "Bring in unlimited friends and teammates to pool connections and unlock the power of shared networks for deeper reach.",
    bgColor: "bg-[#EFFBD7]",
  },
];

const Offerings = () => {
  return (
    <section
      className="bg-[#B2DC8A] items-center justify-center py-12 sm:py-16 md:py-20 lg:py-24"
      aria-labelledby="offerings-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 xl:px-0">
        <header className="mx-auto max-w-2xl text-center px-4">
          <h2
            id="offerings-title"
            className="text-3xl font-medium tracking-tight text-[#0E3D15] sm:text-4xl md:text-5xl"
          >
            What DiscoverMinds offers
          </h2>
        </header>
        <div className="mx-auto mt-5 sm:mt-8 lg:mt-10 w-full">
          <ul className="grid grid-cols-1 gap-5 sm:gap-6 md:gap-8 sm:grid-cols-2 list-none p-0">
            {offeringsData.map((offering, index) => (
              <li
                key={offering.title}
                className="flex flex-col rounded-xl sm:rounded-2xl transition-all duration-300 overflow-hidden"
                aria-labelledby={`offering-title-${index}`}
              >
                <div
                  className={`py-8 sm:py-10 md:py-12 flex items-center justify-center ${offering.bgColor}`}
                  aria-hidden="true"
                >
                  <div
                    className="bg-white p-3 sm:p-4 rounded-full shadow-sm"
                    role="img"
                    aria-label={offering.title}
                  >
                    {offering.icon}
                  </div>
                </div>
                <div className="p-4 sm:p-5 md:p-6 text-center h-28 md:h-36 lg:h-32 bg-white">
                  <h3
                    id={`offering-title-${index}`}
                    className="text-lg sm:text-xl font-bold text-[#0E3D15] mb-1 sm:mb-2"
                  >
                    {offering.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 line-clamp-3 sm:line-clamp-none">
                    {offering.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <UseCasesSection />
      <VideoPlayer />
    </section>
  );
};

export default Offerings;
