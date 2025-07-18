"use client";

import { ReactNode, useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchUserProfile } from "@/store/profileSlice";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "@/components/CustomSideBar/Sidebar";
import { usePathname } from "next/navigation";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

function ProfileDataFetcher({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { profile, loading } = useAppSelector(state => state.profile);
  const [profileFetched, setProfileFetched] = useState<boolean>(false);
  const [navigationHandled, setNavigationHandled] = useState<boolean>(false);

  useEffect(() => {
    if (!user || loading || profileFetched || profile) return;

    const fetchProfile = async () => {
      try {
        setProfileFetched(true);
        await dispatch(fetchUserProfile(user.id));
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfileFetched(false);
      }
    };

    fetchProfile();
  }, [user, loading, profileFetched, profile, dispatch]);

  useEffect(() => {
    if (loading || !profile || navigationHandled) return;

    const handleNavigation = async () => {
      try {
        const path = window.location.pathname;
        if (path === "/") {
          setNavigationHandled(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          router.push("/chat");
        }
      } catch (error) {
        console.error("Navigation error:", error);
        setNavigationHandled(false);
      }
    };

    handleNavigation();
  }, [profile]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          <ProfileDataFetcher>
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
          </ProfileDataFetcher>
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
