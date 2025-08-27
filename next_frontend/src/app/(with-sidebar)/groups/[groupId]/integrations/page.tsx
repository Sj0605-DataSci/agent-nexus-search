"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, List, Puzzle, Settings } from "lucide-react";

interface IntegrationsPageProps {
  params: {
    groupId: string;
  };
}

export default function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { groupId } = params;

  // Integration data
  const integrations = [
    {
      id: "slack",
      name: "Bot for Slack",
      description: "Great for teams that use Slack.",
      logo: "/logos/slack.webp",
      link: "/slack",
    },
    {
      id: "email",
      name: "Email agent",
      description: "Forward emails to search automatically.",
      logo: "/logos/email.webp",
      link: "/email",
    },
    {
      id: "discord",
      name: "Bot for Discord",
      description: "Perfect for Discord communities.",
      logo: "/logos/discord.webp",
      link: "#",
    },
  ];

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      {/* Back button */}
      <Link href="/groups">
        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 mb-2 h-6 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to groups
        </button>
      </Link>

      {/* Group header */}
      <div className="mb-4">
        <div className="flex items-center space-x-4">
          <span className="relative flex shrink-0 overflow-hidden rounded-full size-14 sm:size-16">
            <Image
              className="aspect-square h-full w-full object-cover"
              src="https://mtxrobrwanikajymnkaf.supabase.co/storage/v1/object/public/public-files/HR_Agent.png"
              alt="Group avatar"
              width={64}
              height={64}
            />
          </span>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Friends</h1>
            <p className="text-sm font-medium text-muted-foreground">
              1 member
              <span className="mx-1.5 hidden sm:inline">•</span>
              <span className="hidden sm:inline">Created August 2025</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mt-4 flex flex-col">
        <div className="relative flex flex-row gap-2 overflow-x-auto pb-2 scrollbar-hide md:overflow-x-visible md:pb-0">
          <Link className="relative" href={`/groups/${groupId}`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <Users className="size-4" />
              <span className="font-medium">Group</span>
            </button>
          </Link>
          <Link className="relative" href={`/groups/${groupId}/members`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-muted-foreground">
              <List className="size-4" />
              <span className="font-medium">Members</span>
            </button>
          </Link>
          <Link className="relative" href={`/groups/${groupId}/integrations`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-primary hover:bg-primary/10 hover:text-primary">
              <Puzzle className="size-4" />
              <span className="font-medium">Integrations</span>
            </button>
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary"></div>
          </Link>
          <Link className="relative" href={`/groups/${groupId}/settings`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-muted-foreground">
              <Settings className="size-4" />
              <span className="font-medium">Settings</span>
            </button>
          </Link>
        </div>

        <div
          data-orientation="horizontal"
          role="none"
          className="shrink-0 bg-border h-[1px] w-full mb-4 mt-0 md:mt-2"
        ></div>

        <div className="w-full">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {integrations.map(integration => (
                <div
                  key={integration.id}
                  className="group rounded-xl border bg-card text-card-foreground border-[#5D9CEC]/50 shadow-sm transition-all hover:shadow-md hover:bg-muted/10"
                >
                  <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-0 md:p-6">
                    <div className="flex items-center space-x-5">
                      <div className="flex-shrink-0 p-2 rounded-lg">
                        <Image
                          alt={integration.name}
                          width="48"
                          height="48"
                          className="size-10 object-contain"
                          src={integration.logo}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">
                          {integration.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="w-full md:ml-4 md:w-auto md:flex-shrink-0">
                      <Link className="block" href={integration.link}>
                        <button
                          className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-[#EDF4FE] px-6 py-2 text-sm font-medium text-[#5D9CEC] transition-colors hover:bg-[#DCE8FD] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5D9CEC]/30 disabled:pointer-events-none disabled:opacity-50 md:w-auto"
                          aria-label="Try the feature now"
                        >
                          Try it now
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
