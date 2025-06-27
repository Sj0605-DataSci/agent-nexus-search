"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6"
      role="main"
      aria-labelledby="notfound-title"
    >
      <h1 id="notfound-title" className="text-6xl font-extrabold text-gray-900 mb-4">
        404
      </h1>
      <p className="text-xl text-gray-600 mb-6 max-w-md text-center">
        Oops! The page you are looking for does not exist or has been moved.
      </p>

      <div>
        <Link
          href="/"
          className="inline-block bg-blue-600/50 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}
