"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/CustomSideBar/Sidebar";
import withAuth from "@/hoc/withAuth";
import { Skeleton } from "@/components/ui/skeleton";

const MainContentSkeleton = () => (
  <div className="flex-1 overflow-hidden">
    <div className="h-full overflow-y-auto p-6 sm:p-10 transition-all duration-300 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-md" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid gap-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MainContent = ({
  children,
  isLoading = false,
}: {
  children: React.ReactNode;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return <MainContentSkeleton />;
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto p-6 sm:p-10 bg-white">{children}</div>
    </div>
  );
};

const AuthenticatedMainContent = withAuth(MainContent);

function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <AuthenticatedMainContent>{children}</AuthenticatedMainContent>
    </div>
  );
}

export default WithSidebarLayout;
