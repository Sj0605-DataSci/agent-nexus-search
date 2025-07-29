"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  variant?: "full" | "text-only";
  darkMode?: boolean;
  className?: string;
  showLink?: boolean;
  size?: "small" | "medium" | "large";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  darkMode = false,
  className = "",
  showLink = true,
  size = "medium",
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 20,
      iconContainer: "w-5 h-5",
      textSize: "text-xs",
      gap: "gap-1",
    },
    medium: {
      iconSize: 28,
      iconContainer: "w-7 h-7",
      textSize: "text-2xl",
      gap: "gap-2",
    },
    large: {
      iconSize: 36,
      iconContainer: "w-9 h-9",
      textSize: "text-3xl",
      gap: "gap-3",
    },
  };

  const { iconSize, iconContainer, textSize, gap } = sizeConfig[size];

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
            className={`h-${iconSize / 4} w-${iconSize / 4}`}
          />
        </div>
      )}
      <span
        className={`${textSize} ${variant === "full" ? "font-bold" : "font-semibold"} ${
          darkMode ? "text-white" : "text-gray-900"
        } ${variant === "text-only" && darkMode ? "text-gray-400" : variant === "text-only" ? "text-gray-500" : ""}`}
      >
        DiscoverMinds.ai
      </span>
    </>
  );

  if (showLink) {
    return (
      <Link href="/" className={`inline-flex items-center ${gap} ${className}`}>
        {logoContent}
      </Link>
    );
  }

  return <div className={`inline-flex items-center ${gap} ${className}`}>{logoContent}</div>;
};

export default BrandLogo;
