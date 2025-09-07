import React from "react";
import { FallbackProps } from "react-error-boundary";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong</h2>
        <div className="p-3 mb-4 overflow-auto text-sm bg-gray-100 rounded">
          <p className="font-mono text-red-500">{error?.message}</p>
        </div>
        <p className="mb-4 text-gray-600">
          We apologize for the inconvenience. Please try refreshing the page or contact support if
          the issue persists.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
