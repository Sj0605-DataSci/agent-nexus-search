"use client";

import { FiLock } from "react-icons/fi";
import { useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";

interface ComingSoonOverlayProps {
  onClose?: () => void;
}

export default function ComingSoonOverlay({ onClose }: ComingSoonOverlayProps) {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  return (
    <div
      className={`fixed inset-0 top-15 md:top-0 ${collapsed ? "md:left-15" : "md:left-64"} z-40 flex items-center justify-center p-4`}
    >
      <div className="absolute inset-0 backdrop-blur-[3px] "></div>
      <div className="relative w-full max-w-lg bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-5 rounded-full bg-blue-50 text-blue-600">
            <FiLock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Coming Soon</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            We're working on something special! Get notified when our new social features are ready.
          </p>
        </div>
      </div>
    </div>
  );
}
