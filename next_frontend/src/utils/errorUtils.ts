/**
 * Utility functions for handling and formatting error messages
 */

/**
 * Formats error messages from various sources into user-friendly messages
 * @param errorMessage - The raw error message from the API or other source
 * @returns A formatted error message suitable for display to users
 */
export const formatErrorMessage = (errorMessage: any): string => {
  if (!errorMessage) {
    return "An unknown error occurred. Please try again.";
  }

  // Handle string error messages
  if (typeof errorMessage === "string") {
    // Handle Python errors that come in specific format
    if (errorMessage.includes("Error:")) {
      const match = errorMessage.match(/Error:\s*(.+?)(?:'\s*is\s*an|$)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return errorMessage;
  }

  // Handle error objects
  if (typeof errorMessage === "object") {
    if (errorMessage.message) {
      return formatErrorMessage(errorMessage.message);
    }
    try {
      return JSON.stringify(errorMessage);
    } catch (e) {
      return "An error occurred with the request.";
    }
  }

  return String(errorMessage);
};

/**
 * Creates a user-friendly error message with suggestions
 * @param errorMessage - The raw error message
 * @returns A complete error message with suggestions for the user
 */
export const createUserFriendlyErrorMessage = (errorMessage: any): string => {
  const formattedError = formatErrorMessage(errorMessage);

  // Check for specific error types and provide tailored messages
  if (formattedError.toLowerCase().includes("invalid keyword argument")) {
    return `⚠️ There was an issue with processing your request. The system encountered an invalid parameter.\n\nPlease try rephrasing your question or try a different query.`;
  }

  if (
    formattedError.toLowerCase().includes("timeout") ||
    formattedError.toLowerCase().includes("timed out")
  ) {
    return `⚠️ Your request timed out. This might happen with complex queries.\n\nPlease try simplifying your question or try again later.`;
  }

  if (formattedError.toLowerCase().includes("rate limit")) {
    return `⚠️ You've reached the rate limit for requests.\n\nPlease wait a moment before trying again.`;
  }

  // Default message for other errors
  return `⚠️ We encountered an issue: ${formattedError}\n\nPlease try rephrasing your question or try again later.`;
};
