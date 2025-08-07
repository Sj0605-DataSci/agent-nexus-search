"use client";

import withAuth from "@/hoc/withAuth";
import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/CustomSideBar/Sidebar"), { ssr: false });

const MainContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex-1 overflow-hidden">
      <div
        className={`h-full overflow-y-auto p-10 transition-all duration-300 bg-gradient-to-br from-blue-50 to-purple-50`}
      >
        {children}
      </div>
    </main>
  );
};

const AuthenticatedMainContent = withAuth(MainContent);

function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className={`fixed inset-0 -z-10 bg-white`}></div>
      <AuthenticatedMainContent>{children}</AuthenticatedMainContent>
    </div>
  );
}

export default WithSidebarLayout;
