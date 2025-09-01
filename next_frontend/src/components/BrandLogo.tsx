"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface BrandLogoProps {
  variant?: "full" | "text-only";
  className?: string;
  showCrossIcon?: boolean;
  showLink?: boolean;
  size?: "small" | "medium" | "large";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  className = "",
  showLink = true,
  showCrossIcon = false,
  size = "medium",
}) => {
  const router = useRouter();

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 20,
      iconContainer: "w-5 h-5",
      iconClass: "h-5 w-5",
      textSize: "text-xs",
      gap: "gap-1",
    },
    medium: {
      iconSize: 28,
      iconContainer: "w-7 h-7",
      iconClass: "h-7 w-7",
      textSize: "text-2xl",
      gap: "gap-2",
    },
    large: {
      iconSize: 36,
      iconContainer: "w-9 h-9",
      iconClass: "h-9 w-9",
      textSize: "text-3xl ml-1",
      gap: "gap-3",
    },
  };

  const { iconSize, iconContainer, iconClass, textSize, gap } = sizeConfig[size];

  const logoContent = (
    <>
      {variant === "full" && (
        <div
          className={`${iconContainer} rounded overflow-hidden flex items-center justify-center`}
        >
          <Image
            src="/icon.png"
            alt="DiscoverMinds Logo"
            width={iconSize}
            height={iconSize}
            className={iconClass}
          />
        </div>
      )}
      <span
        className={`${textSize}  ${variant === "full" ? "font-bold " : "font-semibold"} text-gray-900 ${
          variant === "text-only" ? "text-gray-500" : ""
        }`}
      >
        DiscoverMinds.ai
      </span>
    </>
  );

  if (showLink) {
    return showCrossIcon ? (
      <Link
        prefetch
        href="/"
        className={`inline-flex items-center w-full justify-between ${gap} ${className}`}
      >
        <div className=" flex flex-row">{logoContent}</div>
        <div className="relative flex   justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className=" p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
      </Link>
    ) : (
      <Link prefetch href="/" className={`inline-flex items-center ${gap} ${className}`}>
        {logoContent}
      </Link>
    );
  }

  return <div className={`inline-flex items-center ${gap} ${className}`}>{logoContent}</div>;
};

export default BrandLogo;
