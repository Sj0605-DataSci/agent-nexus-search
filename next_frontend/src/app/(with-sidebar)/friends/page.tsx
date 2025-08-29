"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [emails, setEmails] = useState("");

  return (
    <div className="container mx-auto px-4 ">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Friends</h1>
        <p className="text-muted-foreground">Friends can search each other's connections.</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search all users..."
          className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1.5 pl-10 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card text-card-foreground border-[#5D9CEC50] bg-[#5D9CEC10]/50">
        <div className="flex flex-col space-y-1 p-3 md:p-6">
          <h3 className="font-semibold tracking-tight flex items-center gap-2 text-lg md:text-xl">
            Invite friends
          </h3>
          <p className="text-sm text-[#71717a] text-muted-foreground">
            Type or paste in emails below, separated by commas.
          </p>
        </div>
        <div className="p-2 md:px-6 pt-0 mt-2">
          <div className="space-y-6">
            <form className="flex flex-col gap-4">
              <div className="space-y-2 flex-1">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="text-sm font-medium">Email addresses</div>
                    <button
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-[#5D9CEC] hover:opacity-70 duration-0 h-auto gap-1.5 p-0"
                      type="button"
                    >
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
                        className="h-4 w-4"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      Invite link
                    </button>
                  </div>
                  <div className="min-h-[2.25rem] w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors relative flex flex-wrap items-start gap-1">
                    <span
                      className={`pointer-events-none absolute left-3 text-gray-400 top-2 text-sm text-muted-foreground ${emails ? "hidden" : ""}`}
                    >
                      john@gmail.com, jane@outlook.com, etc.
                    </span>
                    <div className="flex w-full flex-wrap items-center gap-1">
                      <input
                        className="flex-1 bg-transparent p-0 outline-none placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        type="text"
                        value={emails}
                        onChange={e => setEmails(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  className="bg-[#5D9CEC] hover:bg-green-700 text-white h-9 px-4 py-2 gap-2"
                  type="submit"
                >
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* <div>
        <h2 className="text-lg font-medium mb-4">Your Friends</h2>
        <div className="text-muted-foreground text-center py-8 border rounded-lg">
          <p>No friends yet. Invite some friends to get started!</p>
        </div>
      </div> */}
    </div>
  );
}
