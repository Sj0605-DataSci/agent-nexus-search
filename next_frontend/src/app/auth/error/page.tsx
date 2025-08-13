"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      console.error("Authentication Error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-700 mb-6">
          {error === "no_code"
            ? "Missing authentication code. Please try signing in again."
            : error === "server_error"
              ? "Server error occurred during authentication."
              : "An error occurred during authentication."}
        </p>
        <a href="/user-auth" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Return to Sign In
        </a>
      </div>
    </div>
  );
}
