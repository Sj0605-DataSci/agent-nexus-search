"use client";

import { ComponentType, memo } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import FullScreenLoader from "@/components/common/FullScreenLoader";
import { useAppSelector } from "@/store";

/**
 * Wrap *any* client component with `withAuth(...)`
 * to ensure the user is authenticated before rendering.
 */
function withAuth<P extends object>(Wrapped: ComponentType<P>) {
  const Guard = (props: P) => {
    const router = useRouter();
    const profile = useAppSelector(state => state.profile.profile);
    const loading = useAppSelector(state => state.profile.loading);

    useEffect(() => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("discover_minds_access_token") : null;
      if (!loading && !token && !profile) {
        router.replace("/login");
      }
    }, [loading, profile, router]);

    if (
      loading ||
      (!profile &&
        typeof window !== "undefined" &&
        localStorage.getItem("discover_minds_access_token"))
    ) {
      return <FullScreenLoader isLoading />;
    }

    if (profile) {
      return <Wrapped {...props} />;
    }

    return <FullScreenLoader isLoading />;
  };

  Guard.displayName = `withAuth(${Wrapped.displayName || Wrapped.name || "Component"})`;
  return memo(Guard);
}

export default withAuth;
