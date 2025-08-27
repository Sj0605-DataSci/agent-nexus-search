"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, List, Puzzle, Settings, Copy } from "lucide-react";
import { TabNavigation } from "@/components/groups/TabNavigation";

interface GroupDetailPageProps {
  params: {
    groupId: string;
  };
}

export default function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { groupId } = params;
  const [emailInput, setEmailInput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://discoverminds.ai/invite/${groupId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would handle the invitation logic
    console.log("Sending invitations to:", emailInput);
    setEmailInput("");
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 ">
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
      <TabNavigation groupId={groupId} />

      <div
        data-orientation="horizontal"
        role="none"
        className="shrink-0 bg-border h-[1px] w-full mb-4 mt-0 md:mt-2"
      ></div>

      {/* Main content */}
      <div className="w-full">
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-300/50">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-1">Invite members</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Type or paste in emails below, separated by commas.
              </p>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email addresses</label>
                  <div className="relative">
                    <input
                      className="w-full focus:border-[#5D9CEC]/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5D9CEC]/50  rounded-md border border-gray-300/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      type="text"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="john@gmail.com, jane@outlook.com, etc."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-white hover:bg-red-500 h-9 px-4 py-2"
                    type="submit"
                  >
                    Send invitations
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Invite link section */}
          <div className="rounded-lg border border-gray-300/50">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-1">Invite link</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link with anyone you want to invite to the group.
              </p>
              <div className="flex gap-2">
                <input
                  className="flex h-9 w-full rounded-md border px-3 py-1.5 border-gray-300/50 cursor-pointer select-all font-mono text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  readOnly
                  value={`https://discoverminds.ai/invite/${groupId}`}
                />
                <button
                  className="inline-flex items-center justify-center border-gray-300/50 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-white hover:bg-gray-50 h-9 px-3"
                  type="button"
                  onClick={handleCopyLink}
                >
                  <Copy className="size-4 mr-2" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
