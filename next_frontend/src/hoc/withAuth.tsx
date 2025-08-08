"use client";

import { ComponentType, memo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store";
import FullScreenLoader from "@/components/common/FullScreenLoader";

function withAuth<P extends object>(Wrapped: ComponentType<P>) {
  const Guard = (props: P) => {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const profile = useAppSelector(state => state.profile.profile);
    const loading = useAppSelector(state => state.profile.loading);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
      setIsClient(true);
      setToken(localStorage.getItem("discover_minds_access_token"));
    }, []);

    useEffect(() => {
      if (!isClient) return;

      if (loading) return;

      if (token || profile) {
        setIsLoading(false);
        return;
      }

      const timer = setTimeout(() => {
        if (!token && !profile) {
          router.replace("/login");
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [isClient, loading, profile, router, token]);

    if (isLoading || !isClient || (loading && !profile)) {
      return <FullScreenLoader isLoading />;
    }

    if (token || profile) {
      return <Wrapped {...props} />;
    }

    return <FullScreenLoader isLoading />;
  };

  Guard.displayName = `withAuth(${Wrapped.displayName || Wrapped.name || "Component"})`;
  return memo(Guard);
}

export default withAuth;
