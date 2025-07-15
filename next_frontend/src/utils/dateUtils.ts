/**
 * Format a date string into a human-readable format based on how recent it is
 * @param dateString - The date string to format
 * @returns A formatted date string (Today, Yesterday, Day of week, etc.)
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  // Yesterday
  else if (diffDays === 1) {
    return "Yesterday";
  }
  // This week (within 7 days)
  else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  // This year
  else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  // Different year
  else {
    return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  }
};

/**
 * Format a date string into a simple date format
 * @param dateString - The date string to format
 * @returns A formatted date string in the local format
 */
export const formatSimpleDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};
