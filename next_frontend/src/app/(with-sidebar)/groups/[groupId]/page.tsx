"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, List, Puzzle, Settings, Copy } from "lucide-react";

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
    navigator.clipboard.writeText(`https://happenstance.ai/invite/${groupId}`);
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
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-primary hover:bg-primary/10 hover:text-primary">
              <Users className="size-4" />
              <span className="font-medium">Group</span>
            </button>
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary"></div>
          </Link>
          <Link className="relative" href={`/groups/${groupId}/members`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-muted-foreground">
              <List className="size-4" />
              <span className="font-medium">Members</span>
            </button>
          </Link>
          <Link className="relative" href={`/groups/${groupId}/integrations`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-muted-foreground">
              <Puzzle className="size-4" />
              <span className="font-medium">Integrations</span>
            </button>
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

        {/* Main content */}
        <div className="w-full">
          <div className="space-y-6">
            {/* Invite members section */}
            <div className="rounded-lg border">
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
                        className="w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        type="text"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="john@gmail.com, jane@outlook.com, etc."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-9 px-4 py-2"
                      type="submit"
                    >
                      Send invitations
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Invite link section */}
            <div className="rounded-lg border">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-1">Invite link</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share this link with anyone you want to invite to the group.
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex h-9 w-full rounded-md border px-3 py-1.5 cursor-pointer select-all font-mono text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    readOnly
                    value={`https://happenstance.ai/invite/${groupId}`}
                  />
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-white hover:bg-gray-50 h-9 px-3"
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
    </div>
  );
}
