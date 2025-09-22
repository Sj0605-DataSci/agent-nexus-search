"use client";

import React, { useState } from "react";
import Image from "next/image";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import { useAppSelector } from "@/store";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import toast from "react-hot-toast";
import { showDevFeatureToast } from "@/utils/toast";

export default function GroupsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateGroup = (groupName: string) => {
    showDevFeatureToast();
    // setIsModalOpen(false);
  };

  const { profile, loading } = useAppSelector(state => state.profile);
  const isAuthenticated = !!profile?.id;

  return (
    <>
      <main className="relative">
        {!isAuthenticated && !loading && <ComingSoonOverlay />}
        <div
          className={`container mx-auto  max-w-screen-xl p-4 ${!isAuthenticated && !loading ? "opacity-30 pointer-events-none" : ""}`}
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
              //   onClick={() => setIsModalOpen(true)}
              onClick={() => showDevFeatureToast()}
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
                  <span>Integrate with your existing tools</span>
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
                  <span>Customize your group's experience</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300/50 bg-card p-6 text-card-foreground hover:border-solid hover:bg-muted/50"
                onClick={() => showDevFeatureToast()}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white">
                  <Image
                    src="/logos/slack.webp"
                    alt="Slack"
                    width={32}
                    height={32}
                    priority
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <h3 className="mb-1 text-base font-semibold">Slack</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Add DiscoverMinds to your Slack workspace
                </p>
              </div>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300/50 bg-card p-6 text-card-foreground hover:border-solid hover:bg-muted/50"
                onClick={() => showDevFeatureToast()}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#5865F2]/10">
                  <Image
                    src="/logos/discord.webp"
                    alt="Discord"
                    width={32}
                    height={32}
                    priority
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <h3 className="mb-1 text-base font-semibold">Discord</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Add DiscoverMinds to your Discord server
                </p>
              </div>
              {/* <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300/50 bg-card p-6 text-card-foreground hover:border-solid hover:bg-muted/50"
                onClick={showDevFeatureToast}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#5D9CEC]/10">
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
                    className="h-6 w-6 text-primary"
                    aria-hidden="true"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <h3 className="mb-1 text-base font-semibold">Notion</h3>
                <p className="text-center text-sm text-muted-foreground">
                  Add DiscoverMinds to your Notion workspace
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </main>
      {isModalOpen && (
        <CreateGroupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateGroup}
        />
      )}
    </>
  );
}
