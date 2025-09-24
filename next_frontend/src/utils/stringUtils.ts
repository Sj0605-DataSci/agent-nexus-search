/**
 * String utility functions for the application
 */

/**
 * Gets the initials from a name
 * @param name - The full name to extract initials from
 * @returns The initials (1-2 characters)
 *
 * Examples:
 * - "Ashish Gupta" -> "AG"
 * - "John Doe Smith" -> "JS" (first and last)
 * - "Alex" -> "AL" (first two letters)
 * - "" -> "AG" (default)
 */
export const getInitials = (name: string): string => {
  if (!name) return "AG";

  const nameParts = name.trim().split(/\s+/);

  if (nameParts.length === 1) {
    // If only one name, return first two letters or first letter if name is only one character
    return nameParts[0].substring(0, Math.min(2, nameParts[0].length)).toUpperCase();
  } else {
    // Get first letter of first name and first letter of last name
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  }
};
