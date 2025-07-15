export const generateToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Capitalizes the first letter of each word in a string
 * @param text - The string to capitalize
 * @returns The capitalized string
 */
export const capitalizeText = (text: string): string => {
  if (!text) return "";
  return text
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
