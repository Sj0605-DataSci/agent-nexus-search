import React from "react";

// Icons for the workflow
const ConnectIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-10 w-10 text-gray-800"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.039l1.758-1.758a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const SyncIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-10 w-10 text-gray-800"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  </svg>
);

const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-10 w-10 text-gray-800"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const steps = [
  {
    title: "Connect",
    description:
      "Open Tara and connect to your local TallyPrime. Tara fetches your real-time data securely.",
    icon: ConnectIcon,
  },
  {
    title: "Sync",
    description:
      "Your TallyPrime data is synced to the cloud, keeping everything up-to-date and accessible.",
    icon: SyncIcon,
  },
  {
    title: "Chat on WhatsApp",
    description:
      "Ask prices • Check stock • Get help. Access your business data 24/7 via WhatsApp.",
    icon: ChatIcon,
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-yellow-600">
            WORK PROCESS
          </p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">How It Works</h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-y-12 text-center md:grid-cols-3 md:gap-x-12">
          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center">
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-10 hidden h-0.5 w-full -translate-y-1/2 bg-gray-200 md:block"></div>
              )}
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                <step.icon />
              </div>
              <h3 className="mt-6 text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
