import React from 'react';

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
   // "FEF9C3", // yellow-100
   // "E0E7FF", // indigo-100
   "F5F5F4", // stone-100
 ];

  // Use the full initials (up to 2 characters)
  const displayInitials = initials.slice(0, 2).toUpperCase();
  const firstChar = displayInitials.charAt(0);
  const charCode = firstChar.charCodeAt(0);
  const colorIndex = (charCode - 'A'.charCodeAt(0)) % colors.length;
  const color = colors[colorIndex];

  // Using a darker text color (333333) for better contrast on light backgrounds
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayInitials)}&background=${color}&color=333333`;
};

interface CustomAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-16 w-16 text-2xl',
};

const CustomAvatar: React.FC<CustomAvatarProps> = ({
  name,
  src,
  size = 'md',
  className = '',
  showBorder = false,
}) => {
  const initials = name
    ?.split(' ')
    ?.map((n) => n[0])
    ?.join('')
    ?.toUpperCase();

  const avatarUrl = src || getInitialsAvatar(initials || 'U');
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const borderClass = showBorder ? 'border border-gray-100 shadow-sm' : '';

  return (
    <div
      className={`relative flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ${sizeClass} ${borderClass} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = getInitialsAvatar(initials || 'U');
          }}
        />
      ) : (
        <span className="font-medium text-gray-600">{initials || 'U'}</span>
      )}
    </div>
  );
};

export default CustomAvatar;
