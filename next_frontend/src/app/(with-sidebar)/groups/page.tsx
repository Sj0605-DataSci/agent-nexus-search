"use client";

import React, { useState } from "react";
import Image from "next/image";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import { useAppSelector } from "@/store";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { handleLinkClickSmartly } from "../friends/page";

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateGroup = (groupName: string) => {
    handleLinkClickSmartly();
    // setIsModalOpen(false);
  };
  const profile = useAppSelector(state => state.profile.profile);
  const isAuthenticated = !!profile?.id;

  return (
    <>
      <main className="relative">
        {!isAuthenticated && <ComingSoonOverlay />}
        <div
          className={`container mx-auto  max-w-screen-xl p-4 ${!isAuthenticated ? "opacity-30 pointer-events-none" : ""}`}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold md:text-3xl">Groups</h1>
            <div className="text-sm text-muted-foreground md:text-base">
              Group members can search each other's connections.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
              className="cursor-pointer rounded-xl border-1 border-dashed border-[#5D9CEC]/50 bg-card px-4 py-3 text-card-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
              role="button"
              aria-haspopup="dialog"
              aria-expanded={isModalOpen}
              // onClick={() => setIsModalOpen(true)}
            >
              <div className="flex items-center space-x-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f3ee]/60">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold leading-none tracking-tight">New group</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a group for your team or community.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-6 mt-10">
            <h2 className="text-lg font-bold md:text-xl">Integrations</h2>
            <p className="mb-6 text-base text-muted-foreground">
              Bring DiscoverMinds to your group's home.
            </p>
            <div className="mb-8">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5D9CEC]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-check h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span>Onboard your team automatically</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5D9CEC]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-check h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span>Tag the DiscoverMinds bot to run searches</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5D9CEC]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-check h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span>Only runs in channels you give it access to</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="group rounded-xl border bg-card text-card-foreground border-[#5D9CEC]/50 shadow-sm transition-all hover:shadow-md hover:bg-muted/10">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-0 md:p-6">
                  <div className="flex items-center space-x-5">
                    <div className="flex-shrink-0 p-2 rounded-lg">
                      <Image
                        alt="Slack"
                        width="48"
                        height="48"
                        className="size-10 object-contain"
                        src="/logos/slack.webp"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <h3 className="text-lg font-semibold leading-none tracking-tight">
                        Bot for Slack
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Great for teams that use Slack.
                      </p>
                    </div>
                  </div>
                  <div className="w-full md:ml-4 md:w-auto md:flex-shrink-0">
                    <button
                      onClick={handleLinkClickSmartly}
                      className="block"
                      // href="/slack"
                    >
                      <div
                        className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-[#EDF4FE] px-6 py-2 text-sm font-medium text-[#5D9CEC] transition-colors hover:bg-[#DCE8FD] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5D9CEC]/30 disabled:pointer-events-none disabled:opacity-50 md:w-auto"
                        aria-label="Try the feature now"
                      >
                        Try it now
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              <div className="group rounded-xl border bg-card border-[#5D9CEC]/50 text-card-foreground shadow-sm transition-all hover:shadow-md hover:bg-muted/10">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-0 md:p-6">
                  <div className="flex items-center space-x-5">
                    <div className="flex-shrink-0 bg-[#EEEAF900] p-2 rounded-lg">
                      <Image
                        alt="Email Agent"
                        width="50"
                        height="50"
                        className="size-10 object-contain"
                        src="/logos/email.webp"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <h3 className="text-lg font-semibold leading-none tracking-tight">
                        Email agent
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Forward emails to search automatically.
                      </p>
                    </div>
                  </div>
                  <div className="w-full md:ml-4 md:w-auto md:flex-shrink-0">
                    <button
                      className="block"
                      //  href="/email"
                      onClick={handleLinkClickSmartly}
                    >
                      <button
                        className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-[#EDF4FE] px-6 py-2 text-sm font-medium text-[#5D9CEC] transition-colors hover:bg-[#DCE8FD] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5D9CEC]/30 disabled:pointer-events-none disabled:opacity-50 md:w-auto"
                        aria-label="Try the feature now"
                      >
                        Try it now
                      </button>
                    </button>
                  </div>
                </div>
              </div>
              <div className="group rounded-xl border bg-card border-[#5D9CEC]/50 text-card-foreground shadow-sm transition-all hover:shadow-md hover:bg-muted/10">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-0 md:p-6">
                  <div className="flex items-center space-x-5">
                    <div className="flex-shrink-0 bg-[#EEEAF900] p-2 rounded-lg">
                      <Image
                        alt="Discord"
                        width="50"
                        height="50"
                        className="size-10 object-contain"
                        src="/logos/discord.webp"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <h3 className="text-lg font-semibold leading-none tracking-tight">
                        Bot for Discord
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Perfect for Discord communities.
                      </p>
                    </div>
                  </div>
                  <div className="w-full md:ml-4 md:w-auto md:flex-shrink-0">
                    <button
                      onClick={handleLinkClickSmartly}
                      className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-[#EDF4FE] px-6 py-2 text-sm font-medium text-[#5D9CEC] transition-colors hover:bg-[#DCE8FD] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5D9CEC]/30 disabled:pointer-events-none disabled:opacity-50 md:w-auto"
                      aria-label="Try the feature now"
                    >
                      Try it now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
      />
    </>
  );
}
