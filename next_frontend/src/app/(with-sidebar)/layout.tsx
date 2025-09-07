"use client";

import { useState, useEffect, memo } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/CustomSideBar/Sidebar";
import withAuth from "@/hoc/withAuth";
import { useAppSelector } from "@/store";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import { getStoredToken } from "@/utils/tokenManagement";

const PUBLIC_ROUTES = ["/user-query", "/groups", "/friends", "/connections", "/agents"];

const MainContent = memo(({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 overflow-hidden">
    <div className="h-full overflow-y-auto p-2 sm:p-6 pt-20 md:pt-8 bg-white">{children}</div>
  </div>
));

MainContent.displayName = "MainContent";

const AuthenticatedMainContent = withAuth(MainContent);

function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useAppSelector(state => state.profile.profile);
  const [authState, setAuthState] = useState<{ token: string | null, isLoading: boolean }>({
    token: null,
    isLoading: true
  });

  useEffect(() => {
    const token = getStoredToken();
    setAuthState({ token, isLoading: false });
  }, []);

  const isPublicRoute = pathname ? PUBLIC_ROUTES.some(route => pathname.includes(route)) : false;
  
  const shouldRenderDirectly = isPublicRoute || Boolean(authState.token || profile);

  if (authState.isLoading) {
    return <FullScreenLoader isLoading />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      {shouldRenderDirectly ? (
        <MainContent>{children}</MainContent>
      ) : (
        <AuthenticatedMainContent>{children}</AuthenticatedMainContent>
      )}
    </div>
  );
}

export default WithSidebarLayout;
