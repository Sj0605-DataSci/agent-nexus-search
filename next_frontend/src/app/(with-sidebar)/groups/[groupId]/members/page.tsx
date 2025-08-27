"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, List, Puzzle, Settings, MoreHorizontal } from "lucide-react";

interface MembersPageProps {
  params: {
    groupId: string;
  };
}

export default function MembersPage({ params }: MembersPageProps) {
  const { groupId } = params;

  // Mock data for members
  const members = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      role: "Admin",
      avatar:
        "https://mtxrobrwanikajymnkaf.supabase.co/storage/v1/object/public/public-files/HR_Agent.png",
      joinedDate: "August 2025",
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
              {members.length} member
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
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-primary hover:bg-primary/10 hover:text-primary">
              <List className="size-4" />
              <span className="font-medium">Members</span>
            </button>
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary"></div>
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
            {/* Members list */}
            <div className="rounded-lg border bg-card text-card-foreground">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="font-semibold leading-tight tracking-tight">Members</h3>
                <p className="text-sm text-muted-foreground">
                  People who have access to this group.
                </p>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-3 text-left font-medium">Name</th>
                          <th className="pb-3 text-left font-medium hidden md:table-cell">Email</th>
                          <th className="pb-3 text-left font-medium">Role</th>
                          <th className="pb-3 text-left font-medium hidden md:table-cell">
                            Joined
                          </th>
                          <th className="pb-3 text-right font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(member => (
                          <tr key={member.id} className="border-b last:border-b-0">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <span className="relative flex shrink-0 overflow-hidden rounded-full size-8">
                                  <Image
                                    className="aspect-square h-full w-full object-cover"
                                    src={member.avatar}
                                    alt={member.name}
                                    width={32}
                                    height={32}
                                  />
                                </span>
                                <span className="font-medium">{member.name}</span>
                              </div>
                            </td>
                            <td className="py-3 hidden md:table-cell text-muted-foreground">
                              {member.email}
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3 hidden md:table-cell text-muted-foreground">
                              {member.joinedDate}
                            </td>
                            <td className="py-3 text-right">
                              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending invitations */}
            <div className="rounded-lg border bg-card text-card-foreground">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="font-semibold leading-tight tracking-tight">Pending invitations</h3>
                <p className="text-sm text-muted-foreground">
                  People who have been invited but haven't joined yet.
                </p>
              </div>
              <div className="p-6 pt-0">
                <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                  No pending invitations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
