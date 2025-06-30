"use client";

import { ComponentType, memo } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import FullScreenLoader from "@/components/common/FullScreenLoader";
import { useAuth } from "@/hooks/useAuth";

/**
 * Wrap *any* client component with `withAuth(...)`
 * to ensure the user is authenticated before rendering.
 */
function withAuth<P extends object>(Wrapped: ComponentType<P>) {
  const Guard = (props: P) => {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        router.replace("/login");
      }
    }, [loading, user, router]);

    if (loading || (!user && typeof window !== "undefined")) {
      return <FullScreenLoader isLoading />;
    }

    return <Wrapped {...props} />;
  };

  Guard.displayName = `withAuth(${Wrapped.displayName || Wrapped.name || "Component"})`;
  return memo(Guard);
}

export default withAuth;
