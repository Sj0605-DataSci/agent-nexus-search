"use client";

import { ReactNode, useState } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();

  const showSidebarRoutes = ["/marketplace", "/profile", "/searchengine", "/chat", "/agents"];

  const shouldShowSidebar = showSidebarRoutes.some(route => pathname.startsWith(route));

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          {shouldShowSidebar && <Sidebar />}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            closeOnClick
            pauseOnHover
            limit={4}
            draggable
            theme="light"
          />
          <main className={shouldShowSidebar ? "pl-64" : ""}>{children}</main>
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
