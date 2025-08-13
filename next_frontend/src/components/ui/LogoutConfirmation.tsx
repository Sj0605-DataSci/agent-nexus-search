"use client";

import { FiAlertTriangle } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface LogoutConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLoggingOut: boolean;
}

export const LogoutConfirmation = ({
  onConfirm,
  onCancel,
  isLoggingOut,
}: LogoutConfirmationProps) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
            <FiAlertTriangle className="h-6 w-6 text-amber-600 0" />
          </div>
          <h3 className="text-lg font-medium text-gray-900  mb-2">
            Are you sure you want to sign out?
          </h3>
          <p className="text-sm text-gray-500  mb-6">
            You'll need to sign back in to access your account and continue your work.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium "
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium min-w-[100px]"
            >
              {isLoggingOut ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing out...
                </>
              ) : (
                "Sign out"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
