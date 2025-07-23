"use client";

import withAuth from "@/hoc/withAuth";
import { useAppSelector } from "@/store";
import dynamic from "next/dynamic";
const Sidebar = dynamic(() => import("@/components/CustomSideBar/Sidebar"), { ssr: false });

function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  const darkMode = useAppSelector(s => s.theme.dark);
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className={`fixed inset-0 -z-10 ${darkMode ? "bg-gray-900" : "bg-white"}`}></div>

      <main className="flex-1 overflow-hidden">
        <div
          className={`h-full overflow-y-auto p-10 transition-all duration-300 ${
            darkMode
              ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800"
              : "bg-gradient-to-br from-blue-50 to-purple-50"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export default withAuth(WithSidebarLayout);
