"use client";

import Image from "next/image";
import { Clock } from "lucide-react";
import toast from "react-hot-toast";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { useAppSelector } from "@/store";

const handleLinkClickSmartly = () => {
  toast.success("Ammm...smart boy yk!, better luck next time");
};

export default function ConnectionsPage() {
  const profile = useAppSelector(state => state.profile.profile);
  const isAuthenticated = !!profile?.id;

  const connections = [
    {
      id: "gmail",
      name: "Gmail",
      description: "Add your Gmail contacts.",
      logo: "/logos/gmail.webp",
      alt: "Gmail",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      description: "Add your LinkedIn connections.",
      logo: "/logos/linkedin.webp",
      alt: "LinkedIn",
    },
    {
      id: "twitter",
      name: "Twitter",
      description: "Add your Twitter followers.",
      logo: "/logos/twitter.webp",
      alt: "Twitter",
    },
    {
      id: "outlook",
      name: "Outlook",
      description: "Add your Outlook contacts.",
      logo: "/logos/outlook.webp",
      alt: "Outlook",
    },
  ];

  return (
    <div className="relative">
      {!isAuthenticated && <ComingSoonOverlay />}

      <div
        className={`container mx-auto px-4 ${!isAuthenticated ? "opacity-30 pointer-events-none" : ""}`}
      ></div>
      {/* // <div className="relative w-full flex-1"> */}
      <div className="absolute inset-0 flex flex-col">
        <main>
          <div className="container mx-auto max-w-screen-xl p-4 md:p-8">
            <div className="mb-4">
              <h1 className="text-2xl font-bold md:text-3xl">Connections</h1>
              <div className="text-sm text-muted-foreground md:text-base">
                Make your network searchable to you, your friends, and groups you're in. We never
                share, sell, or use your data to train AI models.
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground md:mt-2 md:items-center md:gap-2 md:text-sm">
                <Clock className="size-3 md:size-4" aria-hidden="true" />
                We'll email you when processing is complete.
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2">
              <div
                role="alert"
                className="relative w-full rounded-md bg-[#EDF4FE] px-4 py-3 text-sm font-medium text-primary [&>svg+div]:-translate-y-1 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7"
              >
                <div className="text-sm [&_p]:leading-relaxed">
                  Looks like you haven't connected any accounts. Connect an account below!
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {connections.map(connection => (
                <div
                  key={connection.id}
                  className="group relative cursor-pointer rounded-lg border border-dashed border-gray-300/50 bg-card text-card-foreground hover:border-solid hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:gap-0 md:p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Image
                          src={connection.logo}
                          alt={connection.alt}
                          width={64}
                          height={64}
                          className="size-10 object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex h-6 items-center justify-between gap-2 md:justify-start">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold leading-none tracking-tight">
                              {connection.name}
                            </h3>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{connection.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={handleLinkClickSmartly}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 "
                      >
                        <span className="flex items-center gap-1.5">
                          Connect
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ml-0.5"
                          >
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
