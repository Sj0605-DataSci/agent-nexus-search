"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MoreHorizontal,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ChevronsUpDown,
  User,
  ShieldX,
} from "lucide-react";
import { TabNavigation } from "@/components/groups/TabNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface GroupMembersPageProps {
  params: {
    groupId: string;
  };
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedDate: string;
  avatar: string;
  connections: number;
  isCurrentUser?: boolean;
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

type SortField = "name" | "connections" | "joinedDate";
type SortDirection = "asc" | "desc";

export default function GroupMembersPage({ params }: GroupMembersPageProps) {
  const { groupId } = params;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter members based on search query
  const filteredMembers = members.filter(
    member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort members based on sort field and direction
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortField === "name") {
      return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortField === "connections") {
      return sortDirection === "asc"
        ? a.connections - b.connections
        : b.connections - a.connections;
    } else {
      return sortDirection === "asc"
        ? new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime()
        : new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime();
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = sortedMembers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
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

      {/* Navigation tabs */}
      <TabNavigation groupId={groupId} />

      <div
        data-orientation="horizontal"
        role="none"
        className="shrink-0 bg-border h-[1px] w-full mb-4 mt-0 md:mt-2"
      ></div>

      {/* Main content */}
      <div className="w-full">
        <div>
          {/* Search and filters */}
          <div className="mb-4 flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="flex w-full rounded-md border border-gray-300/50 bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-10 pl-9"
                placeholder="Search members..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Members table */}
          <div className="rounded-md border border-gray-300/50">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm table-fixed">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b border-gray-300/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th
                      className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                      style={{ width: "320px" }}
                    >
                      <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 ml-1 p-1 hover:bg-transparent"
                        onClick={() => handleSort("name")}
                      >
                        Member
                        {renderSortIcon("name")}
                      </button>
                    </th>
                    <th
                      className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                      style={{ width: "150px" }}
                    >
                      <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 p-0 hover:bg-transparent"
                        onClick={() => handleSort("connections")}
                      >
                        Connections
                        {renderSortIcon("connections")}
                      </button>
                    </th>
                    <th
                      className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                      style={{ width: "150px" }}
                    >
                      <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 p-0 hover:bg-transparent"
                        onClick={() => handleSort("joinedDate")}
                      >
                        Joined
                        {renderSortIcon("joinedDate")}
                      </button>
                    </th>
                    <th
                      className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                      style={{ width: "50px" }}
                    ></th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {currentMembers.map(member => (
                    <tr
                      key={member.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                      data-state="false"
                    >
                      <td className="p-2 align-middle" style={{ width: "320px" }}>
                        <div className="ml-1 flex items-center gap-3">
                          <span className="relative flex shrink-0 overflow-hidden rounded-full h-10 w-10">
                            <Image
                              className="aspect-square h-full w-full object-cover"
                              src={member.avatar}
                              alt={member.name}
                              width={40}
                              height={40}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {member.name}
                                {member.isCurrentUser && (
                                  <span className="ml-1 text-sm text-muted-foreground">(You)</span>
                                )}
                              </p>
                              <div className="inline-flex items-center border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary rounded-full h-5">
                                {member.role}
                              </div>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 align-middle" style={{ width: "150px" }}>
                        <span className="font-medium text-foreground/90">{member.connections}</span>
                      </td>
                      <td className="p-2 align-middle" style={{ width: "150px" }}>
                        <span className="text-muted-foreground">{member.joinedDate}</span>
                      </td>
                      <td className="p-2  align-middle" style={{ width: "50px" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 focus-visible:ring-0"
                              type="button"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-white border border-gray-300/50 rounded-md shadow-lg py-1"
                          >
                            <DropdownMenuItem
                              className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 rounded-sm mx-1"
                              onSelect={e => e.preventDefault()}
                            >
                              <User className="mr-2 h-4 w-4 text-gray-500" />
                              <span>View profile</span>
                            </DropdownMenuItem>
                            {member.role === "Admin" && (
                              <>
                                <DropdownMenuSeparator className="h-px bg-gray-200 my-1" />
                                <DropdownMenuItem
                                  className="cursor-pointer px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 rounded-sm mx-1"
                                  onSelect={e => e.preventDefault()}
                                >
                                  <ShieldX className="mr-2 h-4 w-4" />
                                  <span>Remove admin</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pb-12 pt-2 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <div>
                {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} of{" "}
                {filteredMembers.length}
              </div>
              <div
                data-orientation="vertical"
                role="none"
                className="shrink-0 bg-border w-[1px] h-6"
              ></div>
              <span className="hidden sm:block">Members per page</span>
              <button
                className="flex items-center border-gray-300/50 justify-between whitespace-nowrap rounded-md border border-input bg-transparent py-2 shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 h-6 w-fit gap-1 px-1.5 text-xs text-foreground"
                onClick={() => setItemsPerPage(itemsPerPage === 10 ? 25 : 10)}
              >
                <span>{itemsPerPage}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center border-gray-300/50 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border  bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-6 w-6"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                <span className="text-foreground">{currentPage}</span> of {totalPages || 1}
              </span>
              <button
                className="inline-flex items-center border-gray-300/50 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border  bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-6 w-6"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Pending invitations section */}
          <div className="rounded-lg border border-gray-300/50 mt-6">
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
  );
}
