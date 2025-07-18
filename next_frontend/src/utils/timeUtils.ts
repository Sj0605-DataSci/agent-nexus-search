/**
 * Time-related utility functions
 */

/**
 * Returns a greeting based on the time of day
 * @returns A time-appropriate greeting string
 */
export const getTimeBasedGreeting = (): string => {
  const currentHour = new Date().getHours();
  
  if (currentHour >= 5 && currentHour < 12) {
    return 'Good Morning';
  } else if (currentHour >= 12 && currentHour < 18) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
};

/**
 * Formats a timestamp in a user-friendly way with relative time for recent messages
 * - If within the last minute: "Just now"
 * - If within the last hour: "X minutes ago"
 * - If within the last 24 hours but today: "Today at HH:MM AM/PM"
 * - If yesterday: "Yesterday at HH:MM AM/PM"
 * - If within the last 7 days: "DayName at HH:MM AM/PM"
 * - If this year: "Month Day at HH:MM AM/PM"
 * - If different year: "Month Day, Year at HH:MM AM/PM"
 * 
 * @param timestamp The timestamp to format
 * @returns A formatted string representation of the timestamp
 */
export const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Format time as HH:MM AM/PM
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const timeString = timestamp.toLocaleTimeString(undefined, timeOptions);
  
  // For very recent messages (less than a minute ago)
  if (diffMinutes < 1) {
    return 'Just now';
  }
  
  // For messages within the last hour
  if (diffHours < 1) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  
  // For messages within today (but more than an hour ago)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timestampDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
  
  if (timestampDate.getTime() === today.getTime() && diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  
  // For messages from yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (timestampDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${timeString}`;
  }
  
  // For messages within the last week
  if (diffDays < 7) {
    const dayOptions: Intl.DateTimeFormatOptions = { weekday: 'long' };
    const dayName = timestamp.toLocaleDateString(undefined, dayOptions);
    return `${dayName} at ${timeString}`;
  }
  
  // Check if the timestamp is from the current year
  if (timestampDate.getFullYear() === now.getFullYear()) {
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateString = timestamp.toLocaleDateString(undefined, dateOptions);
    return `${dateString} at ${timeString}`;
  }
  
  // For timestamps from different years
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateString = timestamp.toLocaleDateString(undefined, dateOptions);
  return `${dateString} at ${timeString}`;
};

/**
 * Returns a tooltip-friendly full timestamp format
 * @param timestamp The timestamp to format
 * @returns A detailed timestamp string for tooltips
 */
export const getFullTimestamp = (timestamp: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return timestamp.toLocaleString(undefined, options);
};
