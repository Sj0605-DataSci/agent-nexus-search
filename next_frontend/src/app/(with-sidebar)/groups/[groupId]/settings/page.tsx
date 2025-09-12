"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Save, Trash2, LogOut, ImageUp } from "lucide-react";
import { TabNavigation } from "@/components/groups/TabNavigation";
import { Member } from "../members/page";

interface SettingsPageProps {
  params: {
    groupId: string;
  };
}

const members: Member[] = [
  {
    id: "1",
    name: "Jib Ohe",
    email: "jibohe4323@litepax.com",
    role: "Admin",
    joinedDate: "August 27, 2025",
    avatar:
      "https://mtxrobrwanikajymnkaf.supabase.co/storage/v1/object/public/public-files/HR_Agent.png",
    connections: 0,
    isCurrentUser: true,
  },
];

export default function SettingsPage({ params }: SettingsPageProps) {
  const { groupId } = params;
  const [groupName, setGroupName] = useState("Friends");
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatar, setAvatar] = useState(
    "https://mtxrobrwanikajymnkaf.supabase.co/storage/v1/object/public/public-files/HR_Agent.png"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving group settings:", { groupName });
  };

  const handleDelete = () => {
    console.log("Deleting group");
  };

  const handleLeaveGroup = () => {
    console.log("Leaving group");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
              {members.length} member{members.length !== 1 ? "s" : ""}
              <span className="mx-1.5 hidden sm:inline">•</span>
              <span className="hidden sm:inline">Created August 2025</span>
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <TabNavigation groupId={groupId} />
        <div className="space-y-6">
          {/* Group Settings Card */}
          <div className="rounded-lg border border-gray-300/50 bg-card text-card-foreground">
            <form onSubmit={handleSave}>
              <div className="flex flex-col space-y-1.5 p-6 pb-0">
                <h3 className="font-semibold leading-tight tracking-tight">Group settings</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your group's basic information.
                </p>
              </div>
              <div className="p-6 pt-0 space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <span className="relative flex shrink-0 overflow-hidden rounded-full h-24 w-24">
                      <Image
                        src={avatar}
                        alt="Group avatar"
                        width={96}
                        height={96}
                        className="aspect-square h-full w-full object-cover"
                      />
                      <div
                        className="absolute inset-0 flex h-24 w-24 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-black/50 hover:opacity-100"
                        onClick={handleAvatarClick}
                      >
                        <ImageUp className="h-8 w-8 text-white" />
                      </div>
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="inline-flex items-center  border-gray-300/50 justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs"
                  >
                    Update avatar
                  </button>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="group-name"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Group name
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-gray-300/50 bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-[#5D9CEC]/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5D9CEC]/50 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Group name"
                  />
                </div>

                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${groupName !== "Friends" ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  {groupName !== "Friends" && (
                    <div className="flex items-center p-6 pt-0">
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => setGroupName("Friends")}
                          className="inline-flex items-center border-gray-300/50 justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          // className="inline-flex items-center border-gray-300/50 justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 rounded-md px-3 text-xs gap-2"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-white hover:bg-red-500 h-9 px-4 py-2 text-sm gap-1"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-gray-300/50 bg-card text-card-foreground">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="font-semibold leading-tight tracking-tight text-destructive">
                Danger zone
              </h3>
              <p className="text-sm text-muted-foreground">Actions here cannot be undone.</p>
            </div>
            <div className="p-6 pt-0 space-y-4">
              {/* Leave Group */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Leave group</div>
                  <p className="text-xs text-muted-foreground">
                    You'll need to be invited back to rejoin
                  </p>
                </div>
                <button
                  onClick={handleLeaveGroup}
                  className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-8 rounded-md px-3 text-xs gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave
                </button>
              </div>

              {/* Delete Group */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <div className="text-sm font-medium">Delete group</div>
                  <p className="text-xs text-muted-foreground">
                    This will permanently delete the group and all its data
                  </p>
                </div>
                <div className="flex gap-2">
                  {isDeleting ? (
                    <>
                      <button
                        onClick={() => setIsDeleting(false)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-8 px-3 gap-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsDeleting(true)}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-8 rounded-md px-3 text-xs gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
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
