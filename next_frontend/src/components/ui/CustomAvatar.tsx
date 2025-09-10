import React, { useState, useEffect } from "react";
import Image from "next/image";

export const getInitialsAvatar = (initials: string): string => {
  // Subtle, accessible color palette with good contrast
  const colors = [
    // "D1FAE5", // emerald-100
    // "DBEAFE", // blue-100
    // "F3E8FF", // purple-100
    // "FCE7F3", // pink-100
    // "E0F2FE", // sky-100
    // "FEF3C7", // amber-100
    // "DCFCE7", // green-100
    // "FEE2E2", // red-100
    // "EDE9FE", // violet-100
    // "CCFBF1", // teal-100
    "FEF9C3", // yellow-100
    "E0E7FF", // indigo-100
    "F5F5F4", // stone-100
  ];

  // Use the full initials (up to 2 characters)
  const displayInitials = initials.slice(0, 2).toUpperCase();
  const firstChar = displayInitials.charAt(0);
  const charCode = firstChar.charCodeAt(0);
  const colorIndex = (charCode - "A".charCodeAt(0)) % colors.length;
  const color = colors[colorIndex];

  // Using a darker text color (333333) for better contrast on light backgrounds
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayInitials)}&background=${color}&color=333333`;
};

interface CustomAvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-16 w-16 text-2xl",
};

const CustomAvatar: React.FC<CustomAvatarProps> = ({
  name,
  src,
  size = "md",
  className = "",
  showBorder = false,
}) => {
  const initials = name
    ?.split(" ")
    ?.map(n => n[0])
    ?.join("")
    ?.toUpperCase();

  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const borderClass = showBorder ? "border border-gray-100 shadow-sm" : "";

  // Update imgSrc when src prop changes
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const handleError = () => {
    setImgSrc(undefined); // Reset to use initials
  };

  return (
    <div
      className={`relative flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ${sizeClass} ${borderClass} ${className}`}
    >
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={name || "User avatar"}
          className="h-full w-full object-cover"
          width={100}
          height={100}
          onError={handleError}
          priority
        />
      ) : (
        <span className="font-medium text-gray-600">{initials || "U"}</span>
      )}
    </div>
  );
};

export default CustomAvatar;
