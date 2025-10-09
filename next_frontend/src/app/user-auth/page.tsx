import AuthPage from "@/components/auth/AuthPage";
import { Suspense } from "react";
import BrandLogo from "@/components/BrandLogo";

function AuthPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 h-screen">
        <div className="flex justify-center p-4 md:mt-12 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            <BrandLogo className="mb-3" size="large" />
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:block bg-[#b2dc8b]"></div>
      </div>
    </div>
  );
}

export default function UserAuthPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <AuthPage />
    </Suspense>
  );
}
