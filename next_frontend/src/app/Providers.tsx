"use client";

import { ReactNode, useState } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "@/components/CustomSideBar/Sidebar";
import { usePathname } from "next/navigation";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          <PostHogProvider>
            <AnalyticsProvider>
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
              <ServiceWorkerRegistration />
              <main>{children}</main>
            </AnalyticsProvider>
          </PostHogProvider>
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
