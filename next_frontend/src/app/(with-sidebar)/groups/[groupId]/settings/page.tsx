"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, List, Puzzle, Settings, Save, Trash2 } from "lucide-react";

interface SettingsPageProps {
  params: {
    groupId: string;
  };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { groupId } = params;
  const [groupName, setGroupName] = useState("Friends");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would handle saving the group settings
    console.log("Saving group settings:", { groupName });
    // Show success message or redirect
  };

  const handleDelete = () => {
    // Here you would handle the group deletion
    console.log("Deleting group");
    // Redirect to groups page after deletion
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
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-muted-foreground">
              <Puzzle className="size-4" />
              <span className="font-medium">Integrations</span>
            </button>
          </Link>
          <Link className="relative" href={`/groups/${groupId}/settings`}>
            <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors text-primary hover:bg-primary/10 hover:text-primary">
              <Settings className="size-4" />
              <span className="font-medium">Settings</span>
            </button>
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary"></div>
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
            {/* Group settings */}
            <div className="rounded-lg border bg-card text-card-foreground">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="font-semibold leading-tight tracking-tight">Group settings</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your group's basic information.
                </p>
              </div>
              <div className="p-6 pt-0">
                <form className="space-y-6" onSubmit={handleSave}>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      htmlFor="group-name"
                    >
                      Group name
                    </label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      id="group-name"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-9 px-4 py-2 gap-2"
                      type="submit"
                    >
                      <Save className="h-4 w-4" />
                      Save changes
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-lg border border-destructive/20 bg-card text-card-foreground">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="font-semibold leading-tight tracking-tight text-destructive">
                  Danger zone
                </h3>
                <p className="text-sm text-muted-foreground">Actions here cannot be undone.</p>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  {isDeleting ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">
                        Are you sure you want to delete this group? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                          onClick={() => setIsDeleting(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
                          onClick={handleDelete}
                        >
                          Yes, delete group
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-destructive/50 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/20 h-9 px-4 py-2 gap-2"
                      onClick={() => setIsDeleting(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete group
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
