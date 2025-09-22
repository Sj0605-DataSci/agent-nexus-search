"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { useAppSelector } from "@/store";
import { showDevFeatureToast } from "@/utils/toast";
import LinkedInUrlModal from "./LinkedInUrlModal";
import ImportConnectionsModal from "../profile/ImportConnectionsModal";
import ProfessionalProfile from "../profile/ProfessionalProfile";
import { LinkedInSection } from "../profile/LinkedInSection";

export default function ConnectionsPage() {
  const router = useRouter();
  const { profile, loading } = useAppSelector(state => state.profile);
  const isAuthenticated = !!profile?.id;
  // const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);
  // const [showConnectionsModal, setShowConnectionsModal] = useState(false);

  const handleConnectionClick = (connection?: { id: string; name: string; enabled: boolean }) => {
    if (connection?.enabled) {
      // setLinkedinModalOpen(true);
      router.push("/profile#linkedin-section");
      // profile && !profile.has_connections && setShowConnectionsModal(true);
    } else {
      showDevFeatureToast(`${connection?.name} integration is under development`);
    }
  };

  const connections = [
    {
      id: "linkedin",
      name: "LinkedIn",
      description: "Add your LinkedIn connections.",
      logo: "/logos/linkedin.webp",
      alt: "LinkedIn",
      enabled: true,
    },
    {
      id: "gmail",
      name: "Gmail",
      description: "Add your Gmail contacts.",
      logo: "/logos/gmail.webp",
      alt: "Gmail",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "twitter",
      name: "Twitter",
      description: "Add your Twitter followers.",
      logo: "/logos/twitter.webp",
      alt: "Twitter",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "outlook",
      name: "Outlook",
      description: "Add your Outlook contacts.",
      logo: "/logos/outlook.webp",
      alt: "Outlook",
      enabled: false,
      comingSoon: true,
    },
  ];

  return (
    <div className="relative">
      {!isAuthenticated && !loading && <ComingSoonOverlay />}
      <div
        className={`container mx-auto px-4 ${!isAuthenticated && !loading ? "opacity-30 pointer-events-none" : ""}`}
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
                <div key={connection.id}>
                  <div
                    className={`group relative ${connection.enabled ? "cursor-pointer" : "cursor-not-allowed"} rounded-lg border border-dashed ${connection.enabled ? "border-gray-300/50" : "border-gray-200/50"} bg-card text-card-foreground ${connection.enabled ? "hover:border-solid hover:bg-muted/50" : "opacity-70"}`}
                  >
                    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:gap-0 md:p-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Image
                            src={connection.logo}
                            alt={connection.alt}
                            width={64}
                            height={64}
                            priority
                            className="size-10 object-contain"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex h-6 items-center justify-between gap-2 md:justify-start">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold leading-none tracking-tight">
                                {connection.name}
                              </h3>
                              {connection.comingSoon && (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{connection.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => handleConnectionClick(connection)}
                          className={`inline-flex h-10 items-center justify-center rounded-md ${
                            connection.id === "linkedin" && profile?.has_connections === "synced"
                              ? "bg-green-600 hover:bg-green-700"
                              : connection.id === "linkedin" &&
                                  profile?.has_connections === "syncing"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : connection.enabled
                                  ? "bg-primary hover:bg-indigo-700"
                                  : "bg-gray-300"
                          } px-5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200`}
                          disabled={
                            !connection.enabled ||
                            !profile?.email ||
                            (connection.id === "linkedin" && profile?.has_connections === "syncing")
                          }
                        >
                          <span className="flex items-center gap-1.5">
                            {connection.id === "linkedin" &&
                              profile?.has_connections === "synced" && <>Connected</>}
                            {connection.id === "linkedin" &&
                              profile?.has_connections === "syncing" && (
                                <>
                                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                                  Syncing
                                </>
                              )}
                            {(connection.id !== "linkedin" ||
                              profile?.has_connections === "no_data" ||
                              !profile?.has_connections) && <>Connect</>}
                            {(connection.id !== "linkedin" ||
                              profile?.has_connections === "no_data" ||
                              !profile?.has_connections) && (
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
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* {connection.name === "linkedin" && profile?.has_connections && (
                    <>
                      <LinkedInSection
                        linkedinUrl={profile?.linkedin_url}
                        hasConnections={profile?.has_connections || false}
                        onEditClick={() => setLinkedinModalOpen(true)}
                        onConnectionsClick={handleConnectionClick}
                      />
                      <LinkedInUrlModal
                        open={linkedinModalOpen}
                        onOpenChange={setLinkedinModalOpen}
                      />
                    </>
                  )} */}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      {/* <LinkedInUrlModal open={linkedinModalOpen} onOpenChange={setLinkedinModalOpen} /> */}
      {/* <ImportConnectionsModal open={showConnectionsModal} onOpenChange={setShowConnectionsModal} /> */}
    </div>
  );
}
