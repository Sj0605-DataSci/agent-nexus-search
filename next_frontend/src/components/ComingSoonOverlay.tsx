"use client";

import { FiLock, FiLogIn, FiX, FiArrowRight, FiClock } from "react-icons/fi";
import { useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { useRouter } from "next/navigation";

type OverlayType = "coming-soon" | "login-required";

interface ComingSoonOverlayProps {
  type?: OverlayType;
  onClose?: () => void;
}

export default function ComingSoonOverlay({
  type = "coming-soon",
  onClose,
}: ComingSoonOverlayProps) {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const router = useRouter();

  const handleLoginClick = () => {
    router.push("/user-auth");
  };

  const config = {
    "coming-soon": {
      icon: FiClock,
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      iconColor: "text-white",
      title: "Coming Soon",
      subtitle: "Exciting Features Ahead",
      description:
        "We're crafting something extraordinary! This feature is currently under development and will be available soon.",
      showButton: false,
      buttonText: undefined,
      buttonAction: undefined,
      gradient: "from-indigo-100 via-indigo-200 to-indigo-100",
    },
    "login-required": {
      icon: FiLogIn,
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      iconColor: "text-white",
      title: "Authentication Required",
      subtitle: "Unlock Full Access",
      description:
        "Sign in to unlock this feature and explore everything DiscoverMinds has to offer.",
      showButton: true,
      buttonText: "Login to Continue",
      buttonAction: handleLoginClick,
      gradient: "from-indigo-25 via-indigo-50 to-indigo-25",
    },
  };

  const {
    icon: Icon,
    iconBg,
    iconColor,
    title,
    subtitle,
    description,
    showButton,
    buttonText,
    buttonAction,
    gradient,
  } = config[type];

  return (
    <div
      className={`fixed inset-0 top-15 md:top-0 ${collapsed ? "md:left-15" : "md:left-64"} z-40 flex items-center justify-center p-4 animate-in fade-in duration-300`}
    >
      {/* Enhanced backdrop with gradient overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs"></div>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30`}></div>

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/50 transform transition-all duration-300 hover:scale-[1.02] animate-in zoom-in-95 slide-in-from-bottom-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 group"
            aria-label="Close"
          >
            <FiX className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        )}

        <div className="text-center">
          {/* Animated Icon */}
          <div className="relative inline-block mb-6">
            <div
              className={`absolute inset-0 ${iconBg} rounded-full blur-xl opacity-50 animate-pulse`}
            ></div>
            <div
              className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full ${iconBg} ${iconColor} shadow-lg transform transition-transform duration-300 hover:scale-110`}
            >
              <Icon className="w-8 h-8" />
            </div>
          </div>

          {/* Title Section */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
              {title}
            </h2>
            <p className="text-sm font-medium text-indigo-700 uppercase tracking-wider">
              {subtitle}
            </p>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-8 leading-relaxed text-base">{description}</p>

          {/* Action Button */}
          {showButton && buttonAction && (
            <button
              onClick={buttonAction}
              className="group relative w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>{buttonText}</span>
              <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          )}

          {/* Decorative elements */}
          {!showButton && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-700 animate-pulse delay-150"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
